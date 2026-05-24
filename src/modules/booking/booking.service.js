import mongoose from "mongoose";
import { ApiError } from "../../shared/utils/ApiError.js";
import { t } from "../../shared/i18n/index.js";
import { calculatePriceBreakdown } from "../../shared/services/pricingEngine.js";
import { convertBreakdown } from "../../shared/services/currencyService.js";
import {
  incrementBookedRoomsBatch,
  decrementBookedRoomsBatch,
} from "../room/availability/roomAvailability.repository.js";
import {
  generateBookingNumber,
  createBooking,
  findBookingById,
  findBookingsByClient,
  countBookingsByClient,
  findBookings,
  countBookings,
} from "./booking.repository.js";
import {
  bookingStatus,
  bookingPaymentStatus,
  bookingStatusTransitions,
  cancellationDeadlines,
} from "../../shared/constants/enums.js";
import { buildPagination, buildSort } from "../../shared/utils/apiFeatures.js";
import { UserModel } from "../user/user.model.js";
import { getLoyaltyConfig } from "../loyalty/loyalty.repository.js";
import {
  redeemPointsService,
  refundPointsService,
  earnPointsService,
} from "../loyalty/loyalty.service.js";
import { initiatePaymentService } from "../payment/payment.service.js";
import { resolveTier, updateUserSpentAndTier } from "../tier/tier.service.js";
import {
  notifyGuestBookingConfirmed,
  notifyStaffNewBooking,
  notifyGuestStatusChanged,
} from "./bookingNotifications.js";
import { findRoomTypeById } from "../room/types/roomType.repository.js";

const PENDING_EXPIRY_MINUTES = 15;

// ─── Calculate (Preview) ───────────────────────────────────

export async function calculateBookingService(body, user, lang, currency = "SAR") {
  const { loyaltyPointsToRedeem = 0 } = body;

  // Validate loyalty points if user is authenticated and redeeming
  if (loyaltyPointsToRedeem > 0 && user) {
    const [loyaltyConfig, freshUser] = await Promise.all([
      getLoyaltyConfig(),
      UserModel.findById(user._id).select("loyaltyPoints").lean(),
    ]);

    if (!loyaltyConfig.isActive) {
      throw new ApiError(t("loyalty.LOYALTY_INACTIVE", lang), 400);
    }
    if (loyaltyPointsToRedeem < loyaltyConfig.minRedeemPoints) {
      throw new ApiError(
        t("loyalty.BELOW_MIN_REDEEM", lang, {
          min: loyaltyConfig.minRedeemPoints,
        }),
        400,
      );
    }
    if (loyaltyPointsToRedeem > freshUser.loyaltyPoints) {
      throw new ApiError(t("loyalty.INSUFFICIENT_POINTS", lang), 400);
    }
  }

  // Resolve user tier for discount
  let tierInfo = null;
  if (user) {
    const freshUser = await UserModel.findById(user._id).select("totalSpent").lean();
    tierInfo = await resolveTier(freshUser?.totalSpent || 0);
  }

  const breakdown = await calculatePriceBreakdown(body, lang, tierInfo);

  // Convert to requested currency (default SAR = no-op)
  return convertBreakdown(breakdown, currency);
}

// ─── Create Booking (Client) ───────────────────────────────

export async function createBookingService(body, user, lang) {
  const {
    roomTypeId,
    checkIn,
    checkOut,
    guests,
    reservationOption,
    cancellationPolicy,
    paymentOption,
    guestDetails,
    specialRequests,
    loyaltyPointsToRedeem = 0,
  } = body;

  // 1. Validate loyalty points before anything else
  if (loyaltyPointsToRedeem > 0) {
    const [loyaltyConfig, freshUser] = await Promise.all([
      getLoyaltyConfig(),
      UserModel.findById(user._id).select("loyaltyPoints").lean(),
    ]);

    if (!loyaltyConfig.isActive) {
      throw new ApiError(t("loyalty.LOYALTY_INACTIVE", lang), 400);
    }
    if (loyaltyPointsToRedeem < loyaltyConfig.minRedeemPoints) {
      throw new ApiError(
        t("loyalty.BELOW_MIN_REDEEM", lang, {
          min: loyaltyConfig.minRedeemPoints,
        }),
        400,
      );
    }
    if (loyaltyPointsToRedeem > freshUser.loyaltyPoints) {
      throw new ApiError(t("loyalty.INSUFFICIENT_POINTS", lang), 400);
    }
  }

  // 2. Resolve user tier for discount
  const userDoc = await UserModel.findById(user._id).select("totalSpent").lean();
  const tierInfo = await resolveTier(userDoc?.totalSpent || 0);

  // 3. Calculate price (also validates guests vs maxGuests) + generate booking number in parallel
  const [breakdown, bookingNumber] = await Promise.all([
    calculatePriceBreakdown(
      {
        roomTypeId,
        checkIn,
        checkOut,
        guests,
        reservationOption,
        cancellationPolicy,
        paymentOption,
        loyaltyPointsToRedeem,
      },
      lang,
      tierInfo,
    ),
    generateBookingNumber(),
  ]);

  // 2. Build date array for batch operations
  const start = new Date(checkIn + "T00:00:00.000Z");
  const end = new Date(checkOut + "T00:00:00.000Z");
  const dates = [];
  const current = new Date(start);
  while (current < end) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  // 3. Atomic inventory reservation inside a transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Batch increment all nights in 2 bulk writes instead of N sequential queries
    const success = await incrementBookedRoomsBatch(
      roomTypeId,
      dates,
      breakdown.totalRoomCount,
      session,
    );

    if (!success) {
      await session.abortTransaction();
      throw new ApiError(t("booking.ROOM_NOT_AVAILABLE", lang), 409);
    }

    // 4. Determine initial status
    const isPay = paymentOption === "pay_now";
    const initialStatus = isPay
      ? bookingStatus.PENDING
      : bookingStatus.CONFIRMED;
    const initialPaymentStatus = bookingPaymentStatus.PENDING;

    // 5. Build expiry for pay_now
    const expiresAt = isPay
      ? new Date(Date.now() + PENDING_EXPIRY_MINUTES * 60 * 1000)
      : null;

    // 6. Create booking document
    const booking = await createBooking(
      {
        bookingNumber,
        client: user._id,
        guestDetails,
        createdBy: user._id,
        roomType: roomTypeId,
        guests,
        checkIn: start,
        checkOut: end,
        nights: breakdown.nights,
        reservationOption: breakdown.selectedOptions.reservationOption,
        cancellationPolicy: breakdown.selectedOptions.cancellationPolicy,
        paymentOption: breakdown.selectedOptions.paymentOption,
        priceBreakdown: {
          nightlyRates: breakdown.nightlyRates,
          subtotal: breakdown.subtotal,
          loyaltyDiscount: breakdown.loyaltyDiscount,
          taxableAmount: breakdown.taxableAmount,
          munTaxRate: breakdown.munTaxRate,
          munTax: breakdown.munTax,
          vatRate: breakdown.vatRate,
          vatAmount: breakdown.vatAmount,
          taxes: breakdown.taxes,
          grandTotal: breakdown.grandTotal,
          tierName: breakdown.tierName,
          tierDiscountRate: breakdown.tierDiscountRate,
          tierDiscount: breakdown.tierDiscount,
          finalTotal: breakdown.finalTotal,
        },
        status: initialStatus,
        paymentStatus: initialPaymentStatus,
        expiresAt,
        loyaltyPointsRedeemed: loyaltyPointsToRedeem,
        specialRequests,
        statusHistory: [
          {
            status: initialStatus,
            changedBy: user._id,
            note: "Booking created",
          },
        ],
      },
      session,
    );

    // 7. Debit loyalty points inside the transaction
    if (loyaltyPointsToRedeem > 0) {
      await redeemPointsService(
        user._id,
        booking._id,
        loyaltyPointsToRedeem,
        session,
      );
    }

    await session.commitTransaction();

    // 8. Auto-initiate payment for pay_now bookings
    if (isPay) {
      const paymentData = await initiatePaymentService(
        { bookingId: booking._id.toString() },
        user,
        lang,
      );
      return {
        ...booking.toObject(),
        url: paymentData.checkoutUrl,
      };
    }

    // 9. Notifications for pay_at_hotel bookings (confirmed immediately)
    if (!isPay) {
      const roomType = await findRoomTypeById(roomTypeId, { lean: true });
      const roomTypeName = roomType?.name || "Room";
      notifyGuestBookingConfirmed(booking, roomTypeName);
      notifyStaffNewBooking(booking, roomTypeName);
    }

    return booking;
  } catch (err) {
    if (session.inTransaction()) await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

// ─── Create Manual Booking (Staff/Admin) ───────────────────

export async function createManualBookingService(body, staffUser, lang) {
  const {
    roomTypeId,
    checkIn,
    checkOut,
    guests,
    reservationOption,
    cancellationPolicy,
    paymentOption,
    guestDetails,
    specialRequests,
    clientId = null,
  } = body;

  // Calculate price + generate booking number in parallel
  const [breakdown, bookingNumber] = await Promise.all([
    calculatePriceBreakdown(
      {
        roomTypeId,
        checkIn,
        checkOut,
        guests,
        reservationOption,
        cancellationPolicy,
        paymentOption,
        loyaltyPointsToRedeem: 0,
      },
      lang,
    ),
    generateBookingNumber(),
  ]);

  // Build date array for batch operations
  const start = new Date(checkIn + "T00:00:00.000Z");
  const end = new Date(checkOut + "T00:00:00.000Z");
  const dates = [];
  const current = new Date(start);
  while (current < end) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const success = await incrementBookedRoomsBatch(
      roomTypeId,
      dates,
      breakdown.totalRoomCount,
      session,
    );

    if (!success) {
      await session.abortTransaction();
      throw new ApiError(t("booking.ROOM_NOT_AVAILABLE", lang), 409);
    }

    // Manual bookings: pay_at_hotel → confirmed, paid_offline → confirmed+paid
    const isPaidOffline = paymentOption === "paid_offline";
    const initialStatus = bookingStatus.CONFIRMED;
    const initialPaymentStatus = isPaidOffline
      ? bookingPaymentStatus.PAID
      : bookingPaymentStatus.PENDING;

    const booking = await createBooking(
      {
        bookingNumber,
        client: clientId,
        guestDetails,
        createdBy: staffUser._id,
        roomType: roomTypeId,
        guests,
        checkIn: start,
        checkOut: end,
        nights: breakdown.nights,
        reservationOption: breakdown.selectedOptions.reservationOption,
        cancellationPolicy: breakdown.selectedOptions.cancellationPolicy,
        paymentOption: breakdown.selectedOptions.paymentOption,
        priceBreakdown: {
          nightlyRates: breakdown.nightlyRates,
          subtotal: breakdown.subtotal,
          loyaltyDiscount: 0,
          taxableAmount: breakdown.taxableAmount,
          munTaxRate: breakdown.munTaxRate,
          munTax: breakdown.munTax,
          vatRate: breakdown.vatRate,
          vatAmount: breakdown.vatAmount,
          taxes: breakdown.taxes,
          grandTotal: breakdown.grandTotal,
          tierName: breakdown.tierName,
          tierDiscountRate: breakdown.tierDiscountRate,
          tierDiscount: breakdown.tierDiscount,
          finalTotal: breakdown.finalTotal,
        },
        status: initialStatus,
        paymentStatus: initialPaymentStatus,
        isManualBooking: true,
        specialRequests,
        statusHistory: [
          {
            status: initialStatus,
            changedBy: staffUser._id,
            note: `Manual booking by staff${isPaidOffline ? " — paid offline" : ""}`,
          },
        ],
      },
      session,
    );

    await session.commitTransaction();

    // Notifications for manual booking
    const roomType = await findRoomTypeById(roomTypeId, { lean: true });
    const roomTypeName = roomType?.name || "Room";
    notifyGuestBookingConfirmed(booking, roomTypeName);
    notifyStaffNewBooking(booking, roomTypeName, true);

    return booking;
  } catch (err) {
    if (session.inTransaction()) await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

// ─── Get Booking By ID ─────────────────────────────────────

export async function getBookingByIdService(bookingId, user, lang, currency = "SAR") {
  const booking = await findBookingById(bookingId, {
    populate: [
      { path: "roomType", select: "name images" },
      { path: "client", select: "firstName lastName email" },
      { path: "createdBy", select: "firstName lastName" },
      { path: "statusHistory.changedBy", select: "firstName lastName role" },
    ],
    lean: true,
  });

  if (!booking) {
    throw new ApiError(t("booking.BOOKING_NOT_FOUND", lang), 404);
  }

  // Clients can only see their own bookings
  const isOwner = booking.client?._id?.toString() === user._id.toString();
  const isStaffOrAdmin =
    user.role === "admin" ||
    user.role === "superAdmin" ||
    user.role === "staff";

  if (!isOwner && !isStaffOrAdmin) {
    throw new ApiError(t("common.NO_PERMISSION", lang), 403);
  }

  // Convert priceBreakdown to requested currency
  if (currency.toUpperCase() !== "SAR" && booking.priceBreakdown) {
    booking.priceBreakdown = await convertBreakdown(
      booking.priceBreakdown,
      currency,
    );
  }

  return booking;
}

// ─── List My Bookings (Client) ─────────────────────────────

export async function getMyBookingsService(user, queryParams, lang) {
  const { page, limit, currency = "SAR" } = queryParams;
  const totalCount = await countBookingsByClient(user._id);
  const { pageNum, limitNum, skip } = buildPagination({ page, limit }, 10);

  const bookings = await findBookingsByClient(user._id, {
    skip,
    limit: limitNum,
    populate: { path: "roomType", select: "name images" },
    lean: true,
  });

  // Convert prices if non-SAR currency requested
  if (currency.toUpperCase() !== "SAR") {
    for (const booking of bookings) {
      if (booking.priceBreakdown) {
        booking.priceBreakdown = await convertBreakdown(
          booking.priceBreakdown,
          currency,
        );
      }
    }
  }

  return {
    totalPages: Math.ceil(totalCount / limitNum) || 1,
    page: pageNum,
    results: bookings.length,
    bookings,
  };
}

// ─── List All Bookings (Admin/Staff) ───────────────────────

export async function getAllBookingsService(queryParams, lang) {
  const { page, limit, status, paymentStatus, roomTypeId, currency = "SAR", ...rest } =
    queryParams;

  const filter = {};
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (roomTypeId) filter.roomType = roomTypeId;

  const totalCount = await countBookings(filter);
  const { pageNum, limitNum, skip } = buildPagination({ page, limit }, 20);
  const sort = buildSort(queryParams, "-createdAt");

  const bookings = await findBookings(filter, {
    sort,
    skip,
    limit: limitNum,
    populate: [
      { path: "roomType", select: "name" },
      { path: "client", select: "firstName lastName email" },
    ],
    lean: true,
  });

  // Convert prices if non-SAR currency requested
  if (currency.toUpperCase() !== "SAR") {
    for (const booking of bookings) {
      if (booking.priceBreakdown) {
        booking.priceBreakdown = await convertBreakdown(
          booking.priceBreakdown,
          currency,
        );
      }
    }
  }

  return {
    totalPages: Math.ceil(totalCount / limitNum) || 1,
    page: pageNum,
    results: bookings.length,
    bookings,
  };
}

// ─── Cancel Booking ────────────────────────────────────────

export async function cancelBookingService(bookingId, user, lang) {
  const booking = await findBookingById(bookingId);
  if (!booking) {
    throw new ApiError(t("booking.BOOKING_NOT_FOUND", lang), 404);
  }

  const oldStatus = booking.status;

  // Check if already cancelled
  if (booking.status === bookingStatus.CANCELLED) {
    throw new ApiError(t("booking.BOOKING_ALREADY_CANCELLED", lang), 400);
  }

  // Validate transition
  const allowed = bookingStatusTransitions[booking.status];
  if (!allowed || !allowed.includes(bookingStatus.CANCELLED)) {
    throw new ApiError(
      t("booking.INVALID_STATUS_TRANSITION", lang, {
        from: booking.status,
        to: "cancelled",
      }),
      400,
    );
  }

  // Check cancellation deadline for client-initiated cancellations
  const isStaffOrAdmin =
    user.role === "admin" ||
    user.role === "superAdmin" ||
    user.role === "staff";
  if (!isStaffOrAdmin) {
    // Only owner can cancel
    if (booking.client?.toString() !== user._id.toString()) {
      throw new ApiError(t("common.NO_PERMISSION", lang), 403);
    }

    // Check deadline for free_cancellation
    if (booking.cancellationPolicy.type === "non_refundable") {
      throw new ApiError(t("booking.CANCELLATION_DEADLINE_PASSED", lang), 400);
    }

    const deadlineDays =
      cancellationDeadlines[booking.cancellationPolicy.type] || 0;
    const deadlineDate = new Date(booking.checkIn);
    deadlineDate.setUTCDate(deadlineDate.getUTCDate() - deadlineDays);

    if (new Date() > deadlineDate) {
      throw new ApiError(t("booking.CANCELLATION_DEADLINE_PASSED", lang), 400);
    }
  }

  // Build date array for batch decrement
  const cancelDates = [];
  const cancelCurrent = new Date(booking.checkIn);
  const cancelEnd = new Date(booking.checkOut);
  while (cancelCurrent < cancelEnd) {
    cancelDates.push(new Date(cancelCurrent));
    cancelCurrent.setUTCDate(cancelCurrent.getUTCDate() + 1);
  }

  // Decrement bookedRooms in a transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await decrementBookedRoomsBatch(booking.roomType, cancelDates, session);

    booking.status = bookingStatus.CANCELLED;
    booking.statusHistory.push({
      status: bookingStatus.CANCELLED,
      changedBy: user._id,
      note: isStaffOrAdmin ? "Cancelled by staff/admin" : "Cancelled by guest",
    });

    // Refund redeemed loyalty points
    if (booking.loyaltyPointsRedeemed > 0 && booking.client) {
      await refundPointsService(
        booking.client,
        booking._id,
        booking.loyaltyPointsRedeemed,
        session,
      );
    }

    await booking.save({ session });
    await session.commitTransaction();

    // Notify guest about cancellation
    const roomType = await findRoomTypeById(booking.roomType, { lean: true });
    const roomTypeName = roomType?.name || "Room";
    notifyGuestStatusChanged(
      booking,
      roomTypeName,
      oldStatus,
      bookingStatus.CANCELLED,
      isStaffOrAdmin ? "Cancelled by staff/admin" : "Cancelled by guest",
    );

    return booking;
  } catch (err) {
    if (session.inTransaction()) await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

// ─── Update Booking Status (Staff/Admin) ───────────────────

export async function updateBookingStatusService(bookingId, body, user, lang) {
  const { status: newStatus, note } = body;

  const booking = await findBookingById(bookingId);
  if (!booking) {
    throw new ApiError(t("booking.BOOKING_NOT_FOUND", lang), 404);
  }

  const oldStatus = booking.status;

  // Validate transition
  const allowed = bookingStatusTransitions[booking.status];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new ApiError(
      t("booking.INVALID_STATUS_TRANSITION", lang, {
        from: booking.status,
        to: newStatus,
      }),
      400,
    );
  }

  booking.status = newStatus;
  booking.statusHistory.push({
    status: newStatus,
    changedBy: user._id,
    note: note || `Status changed to ${newStatus}`,
  });

  // Side effects based on new status
  if (newStatus === bookingStatus.CHECKED_OUT && booking.client) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Give loyalty points
      const pointsEarned = await earnPointsService(
        booking.client,
        booking._id,
        booking.priceBreakdown.finalTotal, // Calculate points based on final total
        session,
      );

      // 2. Update user spent and tier
      await updateUserSpentAndTier(
        booking.client,
        booking.priceBreakdown.finalTotal, // Increment spent by final total
        session,
      );

      booking.loyaltyPointsEarned = pointsEarned;
      await booking.save({ session });
      await session.commitTransaction();

      // Notify guest about status change
      const roomType = await findRoomTypeById(booking.roomType, { lean: true });
      notifyGuestStatusChanged(booking, roomType?.name || "Room", oldStatus, newStatus, note);

      return booking;
    } catch (err) {
      if (session.inTransaction()) await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  if (newStatus === bookingStatus.NO_SHOW) {
    // Release rooms — batch decrement
    const noShowDates = [];
    const nsCurrent = new Date(booking.checkIn);
    const nsEnd = new Date(booking.checkOut);
    while (nsCurrent < nsEnd) {
      noShowDates.push(new Date(nsCurrent));
      nsCurrent.setUTCDate(nsCurrent.getUTCDate() + 1);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await decrementBookedRoomsBatch(booking.roomType, noShowDates, session);
      await booking.save({ session });
      await session.commitTransaction();

      // Notify guest about no-show
      const roomType = await findRoomTypeById(booking.roomType, { lean: true });
      notifyGuestStatusChanged(booking, roomType?.name || "Room", oldStatus, newStatus, note);

      return booking;
    } catch (err) {
      if (session.inTransaction()) await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  await booking.save();

  // Notify guest about status change
  const roomType = await findRoomTypeById(booking.roomType, { lean: true });
  notifyGuestStatusChanged(booking, roomType?.name || "Room", oldStatus, newStatus, note);

  return booking;
}
