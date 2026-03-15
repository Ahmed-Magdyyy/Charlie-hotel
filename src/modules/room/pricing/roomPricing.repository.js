import { RoomPricingModel } from "./roomPricing.model.js";

/**
 * Find pricing overrides for a room type within a date range.
 */
export async function findPricingByRoomTypeAndDateRange(
  roomTypeId,
  startDate,
  endDate,
) {
  return RoomPricingModel.find({
    roomType: roomTypeId,
    date: { $gte: startDate, $lte: endDate },
  })
    .sort({ date: 1 })
    .lean();
}

/**
 * Bulk upsert daily prices for a room type across a date range.
 */
export async function upsertPricingForDateRange(
  roomTypeId,
  startDate,
  endDate,
  price,
) {
  const ops = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const date = new Date(current);
    ops.push({
      updateOne: {
        filter: { roomType: roomTypeId, date },
        update: { $set: { price } },
        upsert: true,
      },
    });
    current.setUTCDate(current.getUTCDate() + 1);
  }

  if (ops.length === 0) return { modifiedCount: 0, upsertedCount: 0 };

  return RoomPricingModel.bulkWrite(ops);
}

/**
 * Resolve the price for a single date (used by booking module).
 */
export async function findPriceForDate(roomTypeId, date) {
  return RoomPricingModel.findOne({
    roomType: roomTypeId,
    date,
  }).lean();
}
