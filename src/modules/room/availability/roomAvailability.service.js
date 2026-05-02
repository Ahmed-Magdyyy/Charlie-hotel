import { ApiError } from "../../../shared/utils/ApiError.js";
import { t } from "../../../shared/i18n/index.js";
import { findRoomTypeById, findActiveRoomTypes } from "../types/roomType.repository.js";
import {
  findAvailabilityByRoomTypeAndDateRange,
  upsertBlockedRoomsForDateRange,
  findAvailabilityRecordsInRange,
} from "./roomAvailability.repository.js";
import { findPricingByRoomTypeAndDateRange } from "../pricing/roomPricing.repository.js";
import { cancellationDeadlines } from "../../../shared/constants/enums.js";
import { convertSearchResults } from "../../../shared/services/currencyService.js";

function resolveLabel(prefix, key, lang) {
  return t(`room.${prefix}_${key}`, lang);
}

function resolveSearchResult(rt, lang) {
  return {
    name: rt.name?.[lang] || rt.name?.en,
    description: rt.description?.[lang] || rt.description?.en,
    roomSize: rt.roomSize ?? null,
    beds: rt.beds?.map((bed) => ({
      ...bed,
      label: resolveLabel("BED_TYPE", bed.type, lang),
    })),
    amenities: rt.amenities?.map((key) => ({
      key,
      label: resolveLabel("AMENITY", key, lang),
    })),
    views: rt.views?.map((key) => ({
      key,
      label: resolveLabel("VIEW", key, lang),
    })),
    smokingPolicy: rt.smokingPolicy
      ? { key: rt.smokingPolicy, label: resolveLabel("SMOKING", rt.smokingPolicy, lang) }
      : null,
    accessibilityFeatures: rt.accessibilityFeatures?.map((key) => ({
      key,
      label: resolveLabel("ACCESSIBILITY", key, lang),
    })),
    reservationOptions: rt.reservationOptions?.map((opt) => ({
      ...opt,
      label: resolveLabel("RESERVATION", opt.type, lang),
    })),
    cancellationPolicies: rt.cancellationPolicies?.map((pol) => ({
      ...pol,
      label: resolveLabel("CANCELLATION", pol.type, lang),
      deadline: cancellationDeadlines[pol.type] ?? null,
    })),
    paymentOptions: rt.paymentOptions?.map((opt) => ({
      ...opt,
      label: resolveLabel("PAYMENT", opt.type, lang),
    })),
  };
}

/**
 * Get availability calendar for a room type.
 * Returns totalRooms, bookedRooms, blockedRooms, and available count per date.
 */
export async function getAvailabilityCalendarService(roomTypeId, query, lang) {
  const roomType = await findRoomTypeById(roomTypeId, {
    select: "totalRoomCount isActive",
    lean: true,
  });

  if (!roomType || !roomType.isActive) {
    throw new ApiError(t("room.ROOM_NOT_FOUND", lang), 404);
  }

  const { startDate, endDate } = query;

  const start = startDate
    ? new Date(startDate + "T00:00:00.000Z")
    : new Date(new Date().toISOString().slice(0, 8) + "01T00:00:00.000Z");

  const end = endDate
    ? new Date(endDate + "T00:00:00.000Z")
    : new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));

  const records = await findAvailabilityByRoomTypeAndDateRange(
    roomTypeId,
    start,
    end,
  );

  const recordMap = new Map(
    records.map((r) => [r.date.toISOString().slice(0, 10), r]),
  );

  const calendar = [];
  const current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10);
    const record = recordMap.get(dateStr);

    const bookedRooms = record?.bookedRooms ?? 0;
    const blockedRooms = record?.blockedRooms ?? 0;
    const available = Math.max(0, roomType.totalRoomCount - bookedRooms - blockedRooms);

    calendar.push({
      date: dateStr,
      totalRooms: roomType.totalRoomCount,
      bookedRooms,
      blockedRooms,
      available,
    });

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return {
    roomTypeId,
    totalRoomCount: roomType.totalRoomCount,
    calendar,
  };
}

/**
 * Block/unblock rooms for a room type across a date range.
 * Validates that blockedRooms doesn't exceed available (totalRoomCount - bookedRooms).
 */
export async function blockRoomsService(roomTypeId, body, lang) {
  const roomType = await findRoomTypeById(roomTypeId, {
    select: "_id isActive totalRoomCount",
    lean: true,
  });

  if (!roomType || !roomType.isActive) {
    throw new ApiError(t("room.ROOM_NOT_FOUND", lang), 404);
  }

  const { startDate, endDate, blockedRooms } = body;

  const start = new Date(startDate + "T00:00:00.000Z");
  const end = new Date(endDate + "T00:00:00.000Z");

  if (end < start) {
    throw new ApiError(t("room.AVAILABILITY_END_BEFORE_START", lang), 400);
  }

  const diffDays = (end - start) / (1000 * 60 * 60 * 24);
  if (diffDays > 365) {
    throw new ApiError(t("room.AVAILABILITY_RANGE_TOO_LARGE", lang), 400);
  }

  // Validate blockedRooms doesn't exceed what's available on any date in the range
  const existingRecords = await findAvailabilityByRoomTypeAndDateRange(
    roomTypeId,
    start,
    end,
  );

  const recordMap = new Map(
    existingRecords.map((r) => [r.date.toISOString().slice(0, 10), r]),
  );

  const current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10);
    const record = recordMap.get(dateStr);
    const bookedRooms = record?.bookedRooms ?? 0;
    const maxBlockable = roomType.totalRoomCount - bookedRooms;

    if (blockedRooms > maxBlockable) {
      throw new ApiError(
        t("room.AVAILABILITY_BLOCKED_EXCEEDS_AVAILABLE", lang, {
          date: dateStr,
          max: maxBlockable,
        }),
        400,
      );
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  const result = await upsertBlockedRoomsForDateRange(
    roomTypeId,
    start,
    end,
    blockedRooms,
  );

  return {
    roomTypeId,
    startDate,
    endDate,
    blockedRooms,
    modifiedCount: result.modifiedCount,
    upsertedCount: result.upsertedCount,
  };
}

/**
 * Search available rooms for a check-in/check-out range and guest count.
 * Public endpoint used by the booking flow.
 */
export async function searchAvailableRoomsService(query, lang) {
  const { checkIn, checkOut, guests, currency = "SAR" } = query;

  const start = new Date(checkIn + "T00:00:00.000Z");
  const end = new Date(checkOut + "T00:00:00.000Z");

  if (end <= start) {
    throw new ApiError(t("room.AVAILABILITY_END_BEFORE_START", lang), 400);
  }

  // Get all active room types
  const allRoomTypes = await findActiveRoomTypes({ lean: true });

  // Filter by guest count first
  const candidateTypes = allRoomTypes.filter(
    (rt) => !guests || rt.maxGuests >= Number(guests),
  );

  if (candidateTypes.length === 0) return [];

  // Get all availability records in the date range
  const allRecords = await findAvailabilityRecordsInRange(start, end);

  // Group records by roomType
  const recordsByType = new Map();
  for (const rec of allRecords) {
    const key = rec.roomType.toString();
    if (!recordsByType.has(key)) recordsByType.set(key, []);
    recordsByType.get(key).push(rec);
  }

  // Filter out room types that are unavailable on ANY night
  const availableTypes = candidateTypes.filter((rt) => {
    const records = recordsByType.get(rt._id.toString()) || [];
    for (const rec of records) {
      if (rec.date >= start && rec.date < end) {
        const available = rt.totalRoomCount - rec.bookedRooms - rec.blockedRooms;
        if (available <= 0) return false;
      }
    }
    return true;
  });

  if (availableTypes.length === 0) return [];

  // Sort by basePrice ascending
  availableTypes.sort((a, b) => a.basePrice - b.basePrice);

  // Fetch pricing and build results
  const results = await Promise.all(
    availableTypes.map(async (rt) => {
      const pricing = await findPricingByRoomTypeAndDateRange(rt._id, start, end);
      const overrideMap = new Map(
        pricing.map((p) => [p.date.toISOString().slice(0, 10), p.price]),
      );

      const nightlyRates = [];
      const current = new Date(start);
      while (current < end) {
        const dateStr = current.toISOString().slice(0, 10);
        nightlyRates.push({
          date: dateStr,
          price: overrideMap.get(dateStr) ?? rt.basePrice,
        });
        current.setUTCDate(current.getUTCDate() + 1);
      }

      const totalPrice = nightlyRates.reduce((sum, n) => sum + n.price, 0);
      const resolved = resolveSearchResult(rt, lang);

      return {
        roomTypeId: rt._id,
        name: resolved.name,
        description: resolved.description,
        images: rt.images,
        beds: resolved.beds,
        amenities: resolved.amenities,
        views: resolved.views,
        maxGuests: rt.maxGuests,
        nightlyRates,
        totalPrice,
        reservationOptions: resolved.reservationOptions,
        cancellationPolicies: resolved.cancellationPolicies,
        paymentOptions: resolved.paymentOptions,
      };
    }),
  );

  // Convert prices to requested currency
  return convertSearchResults(results, currency);
}
