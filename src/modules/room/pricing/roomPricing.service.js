import { ApiError } from "../../../shared/utils/ApiError.js";
import { findRoomTypeById } from "../types/roomType.repository.js";
import {
  findPricingByRoomTypeAndDateRange,
  upsertPricingForDateRange,
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

  const pricing = await findPricingByRoomTypeAndDateRange(
    roomTypeId,
    start,
    end,
  );

  return {
    roomTypeId,
    basePrice: roomType.basePrice,
    pricing: pricing.map((p) => ({
      date: p.date.toISOString().slice(0, 10),
      price: p.price,
    })),
  };
}

/**
 * Bulk set daily prices for a room type across a date range.
 */
export async function bulkSetPricingService(roomTypeId, body) {
  const roomType = await findRoomTypeById(roomTypeId, {
    select: "_id isActive",
    lean: true,
  });

  if (!roomType || !roomType.isActive) {
    throw new ApiError("Room type not found or inactive", 404);
  }

  const { startDate, endDate, price } = body;

  const start = new Date(startDate + "T00:00:00.000Z");
  const end = new Date(endDate + "T00:00:00.000Z");

  if (end < start) {
    throw new ApiError("endDate must be on or after startDate", 400);
  }

  // Cap at 365 days
  const diffDays = (end - start) / (1000 * 60 * 60 * 24);
  if (diffDays > 365) {
    throw new ApiError("Date range cannot exceed 365 days", 400);
  }

  const result = await upsertPricingForDateRange(roomTypeId, start, end, price);

  return {
    roomTypeId,
    startDate,
    endDate,
    price,
    modifiedCount: result.modifiedCount,
    upsertedCount: result.upsertedCount,
  };
}
