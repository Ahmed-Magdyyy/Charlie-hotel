import { ApiError } from "../../../shared/utils/ApiError.js";
import { t } from "../../../shared/i18n/index.js";
import { findRoomTypeById, findActiveRoomTypes } from "../types/roomType.repository.js";
import {
  findAvailabilityByRoomTypeAndDateRange,
  upsertAvailabilityForDateRange,
  findUnavailableRoomTypeIds,
} from "./roomAvailability.repository.js";
import { findPricingByRoomTypeAndDateRange } from "../pricing/roomPricing.repository.js";
import { cancellationDeadlines } from "../../../shared/constants/enums.js";

function resolveLabel(prefix, key, lang) {
  return t(`room.${prefix}_${key}`, lang);
}

function resolveSearchResult(rt, lang) {
  return {
    name: rt.name?.[lang] || rt.name?.en,
    description: rt.description?.[lang] || rt.description?.en,
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
 * Returns totalRooms, bookedRooms, isBlocked, and derived available count per date.
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

  // Default to current month
  const start = startDate
    ? new Date(startDate + "T00:00:00.000Z")
    : new Date(new Date().toISOString().slice(0, 8) + "01T00:00:00.000Z");

  const end = endDate
    ? new Date(endDate + "T00:00:00.000Z")
    : new Date(
        new Date(start.getFullYear(), start.getMonth() + 1, 0)
          .toISOString()
          .slice(0, 10) + "T00:00:00.000Z",
      );

  const records = await findAvailabilityByRoomTypeAndDateRange(
    roomTypeId,
    start,
    end,
  );

  // Build a map of existing records for quick lookup
  const recordMap = new Map(
    records.map((r) => [r.date.toISOString().slice(0, 10), r]),
  );

  // Return every date in the range, defaulting to totalRoomCount when no record
  const calendar = [];
  const current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10);
    const record = recordMap.get(dateStr);

    if (record) {
      calendar.push({
        date: dateStr,
        totalRooms: record.totalRooms,
        bookedRooms: record.bookedRooms,
        available: record.isBlocked ? 0 : record.totalRooms - record.bookedRooms,
        isBlocked: record.isBlocked,
      });
    } else {
      calendar.push({
        date: dateStr,
        totalRooms: roomType.totalRoomCount,
        bookedRooms: 0,
        available: roomType.totalRoomCount,
        isBlocked: false,
      });
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return {
    roomTypeId,
    defaultTotalRooms: roomType.totalRoomCount,
    calendar,
  };
}

/**
 * Bulk set availability for a room type across a date range.
 * Staff can set totalRooms and/or block dates.
 */
export async function bulkSetAvailabilityService(roomTypeId, body, lang) {
  const roomType = await findRoomTypeById(roomTypeId, {
    select: "_id isActive totalRoomCount",
    lean: true,
  });

  if (!roomType || !roomType.isActive) {
    throw new ApiError(t("room.ROOM_NOT_FOUND", lang), 404);
  }

  const { startDate, endDate, totalRooms, isBlocked } = body;

  const start = new Date(startDate + "T00:00:00.000Z");
  const end = new Date(endDate + "T00:00:00.000Z");

  if (end < start) {
    throw new ApiError(t("room.AVAILABILITY_END_BEFORE_START", lang), 400);
  }

  const diffDays = (end - start) / (1000 * 60 * 60 * 24);
  if (diffDays > 365) {
    throw new ApiError(t("room.AVAILABILITY_RANGE_TOO_LARGE", lang), 400);
  }

  // Default totalRooms to the room type's totalRoomCount if not provided
  const effectiveTotalRooms = totalRooms !== undefined ? totalRooms : roomType.totalRoomCount;

  const result = await upsertAvailabilityForDateRange(roomTypeId, start, end, {
    totalRooms: effectiveTotalRooms,
    isBlocked: isBlocked !== undefined ? isBlocked : false,
  });

  return {
    roomTypeId,
    startDate,
    endDate,
    totalRooms: effectiveTotalRooms,
    isBlocked: isBlocked || false,
    modifiedCount: result.modifiedCount,
    upsertedCount: result.upsertedCount,
  };
}

/**
 * Search available rooms for a check-in/check-out range and guest count.
 * Public endpoint used by the booking flow.
 */
export async function searchAvailableRoomsService(query, lang) {
  const { checkIn, checkOut, guests } = query;

  const start = new Date(checkIn + "T00:00:00.000Z");
  const end = new Date(checkOut + "T00:00:00.000Z");

  if (end <= start) {
    throw new ApiError(t("room.AVAILABILITY_END_BEFORE_START", lang), 400);
  }

  // Find room types that are blocked or full on ANY night in the range
  const unavailable = await findUnavailableRoomTypeIds(start, end);
  const excludeIds = new Set(unavailable.map((u) => u._id.toString()));

  // Get all active room types, exclude unavailable ones, filter by guests
  const allRoomTypes = await findActiveRoomTypes({ lean: true });
  const roomTypes = allRoomTypes
    .filter((rt) => {
      if (excludeIds.has(rt._id.toString())) return false;
      if (guests && rt.maxGuests < Number(guests)) return false;
      return true;
    })
    .sort((a, b) => a.basePrice - b.basePrice);

  if (roomTypes.length === 0) return [];

  // Fetch pricing overrides and build nightly rates
  const results = await Promise.all(
    roomTypes.map(async (rt) => {
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

  return results;
}
