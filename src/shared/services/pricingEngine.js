import { findRoomTypeById } from "../../modules/room/types/roomType.repository.js";
import { findPricingByRoomTypeAndDateRange } from "../../modules/room/pricing/roomPricing.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { t } from "../i18n/index.js";

const VAT_RATE = 0.15; // Saudi 15% VAT

/**
 * Calculate full price breakdown for a booking.
 *
 * @param {Object} params
 * @param {string} params.roomTypeId
 * @param {string} params.checkIn           - YYYY-MM-DD
 * @param {string} params.checkOut          - YYYY-MM-DD
 * @param {string} params.reservationOption - e.g. "room_only", "breakfast"
 * @param {string} params.cancellationPolicy - e.g. "free_cancellation"
 * @param {string} params.paymentOption     - e.g. "pay_now"
 * @param {number} [params.loyaltyPointsToRedeem=0]
 * @param {string} [lang="en"]
 * @returns {Object} priceBreakdown
 */
export async function calculatePriceBreakdown(params, lang = "en") {
  const {
    roomTypeId,
    checkIn,
    checkOut,
    guests,
    reservationOption,
    cancellationPolicy,
    paymentOption,
    loyaltyPointsToRedeem = 0,
  } = params;

  // 1. Fetch room type
  const roomType = await findRoomTypeById(roomTypeId, { lean: true });
  if (!roomType || !roomType.isActive) {
    throw new ApiError(t("room.ROOM_NOT_FOUND", lang), 404);
  }

  // 2. Validate guest count
  if (guests && guests > roomType.maxGuests) {
    throw new ApiError(t("booking.GUESTS_EXCEED_MAX", lang), 400);
  }

  // 3. Resolve selected option modifiers from the room type's config
  const resOption = roomType.reservationOptions?.find(
    (o) => o.type === reservationOption,
  );
  if (!resOption) {
    throw new ApiError(t("booking.INVALID_RESERVATION_OPTION", lang), 400);
  }

  const cancPolicy = roomType.cancellationPolicies?.find(
    (p) => p.type === cancellationPolicy,
  );
  if (!cancPolicy) {
    throw new ApiError(t("booking.INVALID_CANCELLATION_POLICY", lang), 400);
  }

  const payOption = roomType.paymentOptions?.find(
    (o) => o.type === paymentOption,
  );
  if (!payOption) {
    throw new ApiError(t("booking.INVALID_PAYMENT_OPTION", lang), 400);
  }

  // 3. Calculate date range
  const start = new Date(checkIn + "T00:00:00.000Z");
  const end = new Date(checkOut + "T00:00:00.000Z");

  if (end <= start) {
    throw new ApiError(t("room.AVAILABILITY_END_BEFORE_START", lang), 400);
  }

  const nights = (end - start) / (1000 * 60 * 60 * 24);

  // 4. Fetch pricing overrides
  const overrides = await findPricingByRoomTypeAndDateRange(
    roomTypeId,
    start,
    end,
  );
  const overrideMap = new Map(
    overrides.map((p) => [p.date.toISOString().slice(0, 10), p.price]),
  );

  // 5. Build nightly rates with modifiers
  const nightlyRates = [];
  const current = new Date(start);
  while (current < end) {
    const dateStr = current.toISOString().slice(0, 10);
    const basePrice = overrideMap.get(dateStr) ?? roomType.basePrice;

    const modifiers = {
      reservation: resOption.priceModifier,
      cancellation: cancPolicy.priceModifier,
      payment: payOption.priceModifier,
    };

    const total =
      basePrice +
      modifiers.reservation +
      modifiers.cancellation +
      modifiers.payment;

    nightlyRates.push({
      date: dateStr,
      basePrice,
      modifiers,
      total: Math.max(0, total), // price can't go negative
    });

    current.setUTCDate(current.getUTCDate() + 1);
  }

  // 6. Calculate totals
  const subtotal = nightlyRates.reduce((sum, n) => sum + n.total, 0);

  // 7. Loyalty discount (capped at subtotal)
  const LOYALTY_POINT_VALUE = 0.1; // 1 point = 0.1 SAR (configurable later)
  const maxDiscount = subtotal;
  const loyaltyDiscount = Math.min(
    loyaltyPointsToRedeem * LOYALTY_POINT_VALUE,
    maxDiscount,
  );

  // 8. Tax
  const taxableAmount = subtotal - loyaltyDiscount;
  const taxes = Math.round(taxableAmount * VAT_RATE * 100) / 100;

  // 9. Grand total
  const grandTotal = Math.round((taxableAmount + taxes) * 100) / 100;

  return {
    roomTypeId,
    roomTypeName: roomType.name,
    maxGuests: roomType.maxGuests,
    totalRoomCount: roomType.totalRoomCount,
    checkIn,
    checkOut,
    nights,
    selectedOptions: {
      reservationOption: {
        type: resOption.type,
        priceModifier: resOption.priceModifier,
      },
      cancellationPolicy: {
        type: cancPolicy.type,
        priceModifier: cancPolicy.priceModifier,
      },
      paymentOption: {
        type: payOption.type,
        priceModifier: payOption.priceModifier,
      },
    },
    nightlyRates,
    subtotal,
    loyaltyPointsRedeemed: loyaltyPointsToRedeem,
    loyaltyDiscount,
    taxableAmount,
    vatRate: VAT_RATE,
    taxes,
    grandTotal,
  };
}
