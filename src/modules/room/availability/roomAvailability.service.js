import { ApiError } from "../../../shared/utils/ApiError.js";
import { t } from "../../../shared/i18n/index.js";
import { findRoomTypeById } from "../types/roomType.repository.js";
import {
  findAvailabilityByRoomTypeAndDateRange,
  upsertAvailabilityForDateRange,
  findAvailableRoomTypeIds,
} from "./roomAvailability.repository.js";
import { findPricingByRoomTypeAndDateRange } from "../pricing/roomPricing.repository.js";
import { findRoomTypes } from "../types/roomType.repository.js";

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

  return {
    roomTypeId,
    defaultTotalRooms: roomType.totalRoomCount,
    calendar: records.map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      totalRooms: r.totalRooms,
      bookedRooms: r.bookedRooms,
      available: r.isBlocked ? 0 : r.totalRooms - r.bookedRooms,
      isBlocked: r.isBlocked,
    })),
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

  // Find room type IDs with availability for every night
  const availableIds = await findAvailableRoomTypeIds(start, end);
  const roomTypeIds = availableIds.map((r) => r._id);

  if (roomTypeIds.length === 0) return [];

  // Fetch those room types, filtered by guest count
  const filter = {
    _id: { $in: roomTypeIds },
    isActive: true,
  };
  if (guests) {
    filter.maxGuests = { $gte: Number(guests) };
  }

  const roomTypes = await findRoomTypes(filter, {
    sort: { basePrice: 1 },
    lean: true,
  });

  // Fetch pricing overrides for each room type in the date range
  const results = await Promise.all(
    roomTypes.map(async (rt) => {
      const pricing = await findPricingByRoomTypeAndDateRange(
        rt._id,
        start,
        end,
      );

      // Build nightly rates: override price or basePrice
      const nightlyRates = [];
      const current = new Date(start);
      while (current < end) {
        const dateStr = current.toISOString().slice(0, 10);
        const override = pricing.find(
          (p) => p.date.toISOString().slice(0, 10) === dateStr,
        );
        nightlyRates.push({
          date: dateStr,
          price: override ? override.price : rt.basePrice,
        });
        current.setUTCDate(current.getUTCDate() + 1);
      }

      const totalPrice = nightlyRates.reduce((sum, n) => sum + n.price, 0);

      return {
        roomTypeId: rt._id,
        name: rt.name,
        description: rt.description,
        images: rt.images,
        beds: rt.beds,
        amenities: rt.amenities,
        views: rt.views,
        maxGuests: rt.maxGuests,
        basePrice: rt.basePrice,
        nightlyRates,
        totalPrice,
        reservationOptions: rt.reservationOptions,
        cancellationPolicies: rt.cancellationPolicies,
        paymentOptions: rt.paymentOptions,
      };
    }),
  );

  return results;
}
