import { findRoomTypeById } from "../../modules/room/types/roomType.repository.js";
import { findPricingByRoomTypeAndDateRange } from "../../modules/room/pricing/roomPricing.repository.js";
import { getLoyaltyConfig } from "../../modules/loyalty/loyalty.repository.js";
import { ApiError } from "../utils/ApiError.js";
import { t, translateEnum } from "../i18n/index.js";
import { MUN_TAX_RATE, VAT_RATE } from "../constants/enums.js";

/**
 * Calculate full price breakdown for a booking.
 *
 * Tax order (Saudi):
 *   1. Municipal tax 2.5% on taxable amount
 *   2. VAT 15% on (taxable amount + municipal tax)
 *
 * Tier discount is applied after taxes on the grandTotal.
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
 * @param {Object} [tierInfo]               - { name, discountRate }
 * @returns {Object} priceBreakdown
 */
export async function calculatePriceBreakdown(
  params,
  lang = "en",
  tierInfo = null,
) {
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
  if (!roomType) {
    throw new ApiError(t("room.ROOM_TYPE_NOT_FOUND", lang), 404);
  }

  // 2. Date range validation
  const start = new Date(checkIn + "T00:00:00.000Z");
  const end = new Date(checkOut + "T00:00:00.000Z");

  if (start >= end) {
    throw new ApiError(t("booking.CHECK_OUT_BEFORE_CHECK_IN", lang), 400);
  }

  const nights = Math.round(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );

  // 3. Resolve booking options
  const resOption = roomType.reservationOptions?.find(
    (o) => o.type === reservationOption,
  );
  if (!resOption) {
    const validOptions =
      roomType.reservationOptions
        ?.map((o) => translateEnum(o.type, lang))
        .join(", ") || "none";
    throw new ApiError(
      t("booking.INVALID_RESERVATION_OPTION", lang, {
        sent: translateEnum(reservationOption, lang),
        valid: validOptions,
      }),
      400,
    );
  }

  const cancPolicy = roomType.cancellationPolicies?.find(
    (p) => p.type === cancellationPolicy,
  );
  if (!cancPolicy) {
    const validPolicies =
      roomType.cancellationPolicies
        ?.map((p) => translateEnum(p.type, lang))
        .join(", ") || "none";
    throw new ApiError(
      t("booking.INVALID_CANCELLATION_POLICY", lang, {
        sent: translateEnum(cancellationPolicy, lang),
        valid: validPolicies,
      }),
      400,
    );
  }

  const payOption = roomType.paymentOptions?.find(
    (o) => o.type === paymentOption,
  );
  if (!payOption) {
    const validPayments =
      roomType.paymentOptions
        ?.map((o) => translateEnum(o.type, lang))
        .join(", ") || "none";
    throw new ApiError(
      t("booking.INVALID_PAYMENT_OPTION", lang, {
        sent: translateEnum(paymentOption, lang),
        valid: validPayments,
      }),
      400,
    );
  }

  // 4. Get nightly pricing for the date range
  const pricingDocs = await findPricingByRoomTypeAndDateRange(
    roomTypeId,
    start,
    end,
  );

  // 5. Build nightly rates with modifiers
  const nightlyRates = [];
  const current = new Date(start);

  while (current < end) {
    const dateStr = current.toISOString().slice(0, 10);
    const priceDoc = pricingDocs.find(
      (p) => p.date.toISOString().slice(0, 10) === dateStr,
    );

    // Fallback to room's base price if no custom price is set for the date
    const base = priceDoc ? priceDoc.price : roomType.basePrice;

    const reservation = resOption.priceModifier || 0;
    const cancellation = cancPolicy.priceModifier || 0;
    const payment = payOption.priceModifier || 0;

    nightlyRates.push({
      date: dateStr,
      basePrice: base,
      modifiers: { reservation, cancellation, payment },
      total:
        Math.round((base + reservation + cancellation + payment) * 100) / 100,
    });

    current.setUTCDate(current.getUTCDate() + 1);
  }

  // 6. Calculate totals
  const subtotal = nightlyRates.reduce((sum, n) => sum + n.total, 0);

  // 7. Loyalty discount (capped at subtotal)
  const loyaltyConfig = await getLoyaltyConfig();
  const loyaltyPointValue = loyaltyConfig?.redeemRate || 0.1;
  const loyaltyDiscount = Math.min(
    loyaltyPointsToRedeem * loyaltyPointValue,
    subtotal,
  );

  // 8. Tier discount (applied on subtotal after loyalty)
  const tierDiscountRate = tierInfo?.discountRate || 0;
  const tierName = tierInfo?.name || "premier";
  const amountAfterLoyalty = Math.max(0, subtotal - loyaltyDiscount);
  const tierDiscount = Math.round(amountAfterLoyalty * tierDiscountRate);

  // 9. Tax — Saudi order: mun tax 2.5% first, then VAT 15% on (amount + mun tax)
  const taxableAmount = amountAfterLoyalty - tierDiscount;
  const munTax = Math.round(taxableAmount * MUN_TAX_RATE * 100) / 100;
  const vatAmount = Math.round((taxableAmount + munTax) * VAT_RATE * 100) / 100;
  const taxes = Math.round((munTax + vatAmount) * 100) / 100;

  // 10. Grand total / Final total (rounded to nearest integer)
  const grandTotal = Math.round(taxableAmount + taxes);
  const finalTotal = grandTotal; // For backward compatibility / consistent naming

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
    subtotal: Math.round(subtotal),
    loyaltyPointsRedeemed: loyaltyPointsToRedeem,
    loyaltyDiscount: Math.round(loyaltyDiscount),
    tierName,
    tierDiscountRate,
    tierDiscount,
    taxableAmount: Math.round(taxableAmount),
    munTaxRate: MUN_TAX_RATE,
    munTax: Math.round(munTax),
    vatRate: VAT_RATE,
    vatAmount: Math.round(vatAmount),
    taxes: Math.round(taxes),
    grandTotal,
    finalTotal,
    currency: "SAR",
  };
}
