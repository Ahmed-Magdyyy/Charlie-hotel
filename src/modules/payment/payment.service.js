import mongoose from "mongoose";
import { ApiError } from "../../shared/utils/ApiError.js";
import { t } from "../../shared/i18n/index.js";
import { getGateway } from "./gateways/gateway.factory.js";
import {
  createPayment,
  findPaymentById,
  findPaymentByGatewayId,
  findPaymentsByBooking,
  findPayments,
  countPayments,
  updatePaymentById,
} from "./payment.repository.js";
import {
  findBookingById,
  updateBookingById,
} from "../booking/booking.repository.js";
import {
  bookingStatus,
  bookingPaymentStatus,
} from "../../shared/constants/enums.js";
import { buildPagination, buildDateRangeFilter } from "../../shared/utils/apiFeatures.js";
import { PaymentModel } from "./payment.model.js";
import {
  notifyGuestBookingConfirmed,
  notifyStaffNewBooking,
} from "../booking/bookingNotifications.js";
import { findRoomTypeById } from "../room/types/roomType.repository.js";

// ─── Initiate Payment ──────────────────────────────────────

export async function initiatePaymentService(body, user, lang) {
  const { bookingId } = body;

  const booking = await findBookingById(bookingId, { lean: true });
  if (!booking) {
    throw new ApiError(t("booking.BOOKING_NOT_FOUND", lang), 404);
  }

  // Only pending pay_now bookings can initiate payment
  if (booking.status !== bookingStatus.PENDING) {
    throw new ApiError(t("payment.BOOKING_NOT_PENDING", lang), 400);
  }

  // Check ownership
  if (booking.client?.toString() !== user._id.toString()) {
    throw new ApiError(t("common.NO_PERMISSION", lang), 403);
  }

  const gateway = getGateway();

  const result = await gateway.initiate({
    amount: booking.priceBreakdown.grandTotal,
    currency: "SAR",
    description: `Charlie Hotel — Booking ${booking.bookingNumber}`,
    bookingId: booking._id.toString(),
    guestDetails: booking.guestDetails || {},
  });

  console.log("payment result", result);

  // Create payment record
  const payment = await createPayment({
    booking: booking._id,
    amount: booking.priceBreakdown.grandTotal,
    currency: "SAR",
    method: "credit_card", // Will be updated after payment completes
    gateway: gateway.name,
    gatewayPaymentId: result.gatewayPaymentId,
    gatewayResponse: result.raw,
    status: "initiated",
  });

  // Link payment to booking
  await updateBookingById(booking._id, { paymentId: payment._id });

  return {
    paymentId: payment._id,
    gatewayPaymentId: result.gatewayPaymentId,
    checkoutUrl: result.checkoutUrl,
  };
}

// ─── Webhook Handler ───────────────────────────────────────

export async function handleWebhookService(reqBody) {
  const gateway = getGateway();
  let result = gateway.parseWebhook(reqBody);

  // Find the payment — try by gateway ID, then invoice ID, then booking ID
  // (We store invoice ID, but webhook sends payment ID)
  let payment = await findPaymentByGatewayId(result.gatewayPaymentId);
  if (!payment && result.invoiceId) {
    payment = await findPaymentByGatewayId(result.invoiceId);
  }
  if (!payment && result.bookingId) {
    const payments = await findPaymentsByBooking(result.bookingId);
    payment = payments.find((p) => p.status === "initiated") || payments[0];
  }
  if (!payment) {
    console.warn(
      `[Payment Webhook] Unknown payment — gatewayId: ${result.gatewayPaymentId}, bookingId: ${result.bookingId}`,
    );
    return { acknowledged: true };
  }

  // Already processed (idempotency guard)
  if (payment.status === "paid" || payment.status === "refunded") {
    return { acknowledged: true };
  }

  // Moyasar sends no auth headers — verify payment status directly via API
  // Use the stored gateway ID (invoice ID) for verification, not the webhook's payment ID
  if (result.needsVerification) {
    const verifyId = payment.gatewayPaymentId || result.gatewayPaymentId;
    const verified = await gateway.verify(verifyId);
    result = {
      ...result,
      paid: verified.paid,
      method: verified.method,
      raw: verified.raw,
    };
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (result.paid) {
      // Atomically update payment status (optimistic lock: only if still initiated)
      const updated = await PaymentModel.findOneAndUpdate(
        { _id: payment._id, status: "initiated" },
        {
          status: "paid",
          method: result.method,
          gatewayResponse: result.raw,
          paidAt: new Date(),
        },
        { returnDocument: "after", session },
      );

      if (!updated) {
        // Another webhook already processed this — abort safely
        await session.abortTransaction();
        return { acknowledged: true };
      }

      // Update booking
      const booking = await findBookingById(payment.booking);
      if (!booking) {
        await session.commitTransaction();
        return { acknowledged: true };
      }

      if (booking.status === bookingStatus.PENDING) {
        // Happy path: booking still pending, confirm it
        booking.status = bookingStatus.CONFIRMED;
        booking.paymentStatus = bookingPaymentStatus.PAID;
        booking.statusHistory.push({
          status: bookingStatus.CONFIRMED,
          changedBy: null,
          note: `Payment confirmed via ${gateway.name}`,
        });
        await booking.save({ session });

        // Send emails after commit (fire-and-forget)
        session.once("ended", async () => {
          try {
            const roomType = await findRoomTypeById(booking.roomType, {
              lean: true,
            });
            const roomTypeName = roomType?.name || "Room";
            notifyGuestBookingConfirmed(booking, roomTypeName);
            notifyStaffNewBooking(booking, roomTypeName);
          } catch (emailErr) {
            console.error(
              "[BOOKING_NOTIFY] Post-payment email error:",
              emailErr.message,
            );
          }
        });
      } else if (booking.status === bookingStatus.EXPIRED) {
        // Edge case: booking expired while user was paying
        // Mark payment as paid, then auto-refund via gateway
        await booking.save({ session });
        await session.commitTransaction();

        // Refund outside the transaction (external API call)
        console.warn(
          `[Payment Webhook] Booking ${booking.bookingNumber} expired but payment succeeded. Initiating auto-refund.`,
        );
        try {
          const refundResult = await gateway.refund(
            result.gatewayPaymentId,
            payment.amount,
          );
          await PaymentModel.findByIdAndUpdate(payment._id, {
            status: "refunded",
            refundId: refundResult.refundId,
            refundedAt: new Date(),
            gatewayResponse: refundResult.raw,
          });
          console.log(
            `[Payment Webhook] Auto-refund completed for booking ${booking.bookingNumber}`,
          );
        } catch (refundErr) {
          console.error(
            `[Payment Webhook] Auto-refund FAILED for booking ${booking.bookingNumber}:`,
            refundErr.message,
          );
          // Manual intervention needed — payment is marked as paid but booking is expired
        }
        return { acknowledged: true };
      } else {
        // Booking in some other terminal state (cancelled, etc.) — same: refund
        await session.commitTransaction();
        console.warn(
          `[Payment Webhook] Booking ${booking.bookingNumber} in status "${booking.status}" but payment succeeded. Initiating auto-refund.`,
        );
        try {
          const refundResult = await gateway.refund(
            result.gatewayPaymentId,
            payment.amount,
          );
          await PaymentModel.findByIdAndUpdate(payment._id, {
            status: "refunded",
            refundId: refundResult.refundId,
            refundedAt: new Date(),
            gatewayResponse: refundResult.raw,
          });
        } catch (refundErr) {
          console.error(
            `[Payment Webhook] Auto-refund FAILED for booking ${booking.bookingNumber}:`,
            refundErr.message,
          );
        }
        return { acknowledged: true };
      }
    } else {
      // Payment failed
      const failedUpdate = await PaymentModel.findOneAndUpdate(
        { _id: payment._id, status: "initiated" },
        { status: "failed", gatewayResponse: result.raw },
        { session },
      );

      // Only update booking if the payment was actually changed (still was "initiated")
      // This prevents a late-arriving webhook from overwriting a successful payment
      if (failedUpdate) {
        const booking = await findBookingById(payment.booking);
        if (booking) {
          booking.paymentStatus = bookingPaymentStatus.FAILED;
          await booking.save({ session });
        }
      }
    }

    await session.commitTransaction();
    return { acknowledged: true };
  } catch (err) {
    if (session.inTransaction()) await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

// ─── Get Payment Status ────────────────────────────────────

export async function getPaymentByBookingService(bookingId, user, lang) {
  const booking = await findBookingById(bookingId, { lean: true });
  if (!booking) {
    throw new ApiError(t("booking.BOOKING_NOT_FOUND", lang), 404);
  }

  // Ownership or staff/admin check
  const isOwner = booking.client?.toString() === user._id.toString();
  const isStaffOrAdmin =
    user.role === "admin" ||
    user.role === "superAdmin" ||
    user.role === "staff";
  if (!isOwner && !isStaffOrAdmin) {
    throw new ApiError(t("common.NO_PERMISSION", lang), 403);
  }

  const payments = await findPaymentsByBooking(bookingId);
  return payments;
}

// ─── Refund ────────────────────────────────────────────────

export async function refundPaymentService(paymentId, user, lang) {
  const payment = await findPaymentById(paymentId);
  if (!payment) {
    throw new ApiError(t("payment.PAYMENT_NOT_FOUND", lang), 404);
  }

  if (payment.status !== "paid") {
    throw new ApiError(t("payment.CANNOT_REFUND", lang), 400);
  }

  // Only online payments can be refunded through gateway
  if (payment.gateway === "offline") {
    throw new ApiError(t("payment.OFFLINE_NO_REFUND", lang), 400);
  }

  const gateway = getGateway();
  const result = await gateway.refund(payment.gatewayPaymentId, payment.amount);

  if (result.success) {
    await updatePaymentById(payment._id, {
      status: "refunded",
      refundId: result.refundId,
      gatewayResponse: result.raw,
      refundedAt: new Date(),
    });

    // Update booking payment status
    const booking = await findBookingById(payment.booking);
    if (booking) {
      booking.paymentStatus = bookingPaymentStatus.REFUNDED;
      booking.statusHistory.push({
        status: booking.status,
        changedBy: user._id,
        note: "Payment refunded",
      });
      await booking.save();
    }
  } else {
    const reason = result.raw?.reason || result.raw?.result || "Unknown error";
    throw new ApiError(
      t("payment.REFUND_FAILED", lang) || `Refund failed: ${reason}`,
      502,
    );
  }

  return result;
}

// ─── Mark pay_at_hotel as Paid (Staff/Admin) ──────────────

export async function markPayAtHotelPaidService(bookingId, user, lang) {
  const booking = await findBookingById(bookingId);
  if (!booking) {
    throw new ApiError(t("booking.BOOKING_NOT_FOUND", lang), 404);
  }

  // Must be a pay_at_hotel booking
  if (booking.paymentOption?.type !== "pay_at_hotel") {
    throw new ApiError(t("payment.NOT_PAY_AT_HOTEL", lang), 400);
  }

  // Must not already be paid
  if (booking.paymentStatus === bookingPaymentStatus.PAID) {
    throw new ApiError(t("payment.ALREADY_PAID", lang), 400);
  }

  // Must be in a bookable state (confirmed or checked_in)
  if (
    booking.status !== bookingStatus.CONFIRMED &&
    booking.status !== bookingStatus.CHECKED_IN
  ) {
    throw new ApiError(t("payment.BOOKING_NOT_ACTIVE", lang), 400);
  }

  // Create an offline payment record
  const payment = await createPayment({
    booking: booking._id,
    amount: booking.priceBreakdown.grandTotal,
    currency: "SAR",
    method: "pay_at_hotel",
    gateway: "offline",
    status: "paid",
    paidAt: new Date(),
  });

  // Update booking
  booking.paymentId = payment._id;
  booking.paymentStatus = bookingPaymentStatus.PAID;
  booking.statusHistory.push({
    status: booking.status,
    changedBy: user._id,
    note: "Payment collected at hotel",
  });
  await booking.save();

  return { booking, payment };
}

// ─── List All Payments (Admin) ─────────────────────────────

export async function getAllPaymentsService(queryParams, lang) {
  const { page, limit, status, q, startDate, endDate, ...rest } = queryParams;

  const { dateFilter, timeFrame } = buildDateRangeFilter(queryParams);

  const filter = {
    ...dateFilter,
  };
  if (status) filter.status = status;

  // Search across payment ID, booking number, user email/phone
  if (q && q.trim()) {
    const searchTerm = q.trim();
    const regex = { $regex: searchTerm, $options: "i" };
    const orConditions = [];

    // Direct match on gatewayPaymentId
    orConditions.push({ gatewayPaymentId: regex });

    // If q looks like a valid ObjectId, also search by payment _id
    if (/^[0-9a-fA-F]{24}$/.test(searchTerm)) {
      orConditions.push({ _id: searchTerm });
    }

    // Find users matching by email, phone, name
    const { UserModel } = await import("../user/user.model.js");
    const matchingUsers = await UserModel.find({
      $or: [
        { email: regex },
        { phone: regex },
        { firstName: regex },
        { lastName: regex },
      ],
    })
      .select("_id")
      .lean();

    const matchingUserIds = matchingUsers.map((u) => u._id);

    // Find bookings matching by bookingNumber, guestDetails, or client user
    const { BookingModel } = await import("../booking/booking.model.js");
    const bookingOrConditions = [
      { bookingNumber: regex },
      { "guestDetails.email": regex },
      { "guestDetails.phone": regex },
    ];

    if (matchingUserIds.length > 0) {
      bookingOrConditions.push({ client: { $in: matchingUserIds } });
    }

    const matchingBookings = await BookingModel.find({
      $or: bookingOrConditions,
    })
      .select("_id")
      .lean();

    if (matchingBookings.length > 0) {
      orConditions.push({
        booking: { $in: matchingBookings.map((b) => b._id) },
      });
    }

    if (orConditions.length > 0) {
      filter.$or = orConditions;
    }
  }

  // Summary stats (across all matching payments, not just current page)
  const [summaryResult] = await PaymentModel.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalCollected: {
          $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$amount", 0] },
        },
        totalRefunded: {
          $sum: { $cond: [{ $eq: ["$status", "refunded"] }, "$amount", 0] },
        },
        pendingCount: {
          $sum: { $cond: [{ $eq: ["$status", "initiated"] }, 1, 0] },
        },
        failedCount: {
          $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
        },
      },
    },
  ]);

  const summary = {
    totalCollected: summaryResult?.totalCollected || 0,
    totalRefunded: summaryResult?.totalRefunded || 0,
    pendingCount: summaryResult?.pendingCount || 0,
    failedCount: summaryResult?.failedCount || 0,
  };

  const totalCount = await countPayments(filter);
  const { pageNum, limitNum, skip } = buildPagination({ page, limit }, 20);

  const payments = await findPayments(filter, {
    skip,
    limit: limitNum,
    populate: {
      path: "booking",
      select: "bookingNumber client guestDetails",
      populate: { path: "client", select: "firstName lastName email phone" },
    },
    lean: true,
  });

  return {
    timeFrame,
    totalPages: Math.ceil(totalCount / limitNum) || 1,
    page: pageNum,
    results: payments.length,
    summary,
    payments,
  };
}

// ─── Get One Payment (Admin) ───────────────────────────────

export async function getOnePaymentService(paymentId, lang) {
  const payment = await findPaymentById(paymentId, {
    populate: {
      path: "booking",
      select: "bookingNumber client guestDetails status paymentStatus roomType checkIn checkOut",
      populate: { path: "client", select: "firstName lastName email phone" },
    },
    lean: true,
  });

  if (!payment) {
    throw new ApiError(t("payment.PAYMENT_NOT_FOUND", lang), 404);
  }

  return payment;
}
