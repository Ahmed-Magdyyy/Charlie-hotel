import { ApiError } from "../../../shared/utils/ApiError.js";
import { findRoomTypeById } from "../types/roomType.repository.js";
import {
  findPricingByRoomTypeAndDateRange,
  upsertPricingEntries,
} from "./roomPricing.repository.js";

/**
 * Get pricing calendar for a room type.
 * Returns basePrice + any daily overrides in the requested range.
 */
export async function getPricingCalendarService(roomTypeId, query) {
  const roomType = await findRoomTypeById(roomTypeId, {
    select: "basePrice isActive",
    lean: true,
  });

  if (!roomType || !roomType.isActive) {
    throw new ApiError("Room type not found or inactive", 404);
  }

  const { startDate, endDate } = query;

  // Default to current month if no range provided
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

  const overrides = await findPricingByRoomTypeAndDateRange(
    roomTypeId,
    start,
    end,
  );

  // Build a map of override dates for quick lookup
  const overrideMap = new Map(
    overrides.map((p) => [p.date.toISOString().slice(0, 10), p.price]),
  );

  // Return every date in the range with the resolved price
  const calendar = [];
  const current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10);
    const override = overrideMap.get(dateStr);
    calendar.push({
      date: dateStr,
      price: override !== undefined ? override : roomType.basePrice,
      isOverride: override !== undefined,
    });
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return {
    roomTypeId,
    basePrice: roomType.basePrice,
    calendar,
  };
}

/**
 * Bulk set daily prices for a room type from an array of date-price entries.
 */
export async function bulkSetPricingService(roomTypeId, body) {
  const roomType = await findRoomTypeById(roomTypeId, {
    select: "_id isActive",
    lean: true,
  });

  if (!roomType || !roomType.isActive) {
    throw new ApiError("Room type not found or inactive", 404);
  }

  const { entries } = body;

  if (entries.length > 365) {
    throw new ApiError("Cannot set more than 365 entries at once", 400);
  }

  const result = await upsertPricingEntries(roomTypeId, entries);

  return {
    roomTypeId,
    count: entries.length,
    modifiedCount: result.modifiedCount,
    upsertedCount: result.upsertedCount,
  };
}
