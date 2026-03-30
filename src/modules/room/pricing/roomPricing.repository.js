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
 * Bulk upsert daily prices for a room type from an array of { date, price } entries.
 */
export async function upsertPricingEntries(roomTypeId, entries) {
  if (!entries || entries.length === 0) return { modifiedCount: 0, upsertedCount: 0 };

  const ops = entries.map(({ date, price }) => ({
    updateOne: {
      filter: { roomType: roomTypeId, date: new Date(date + "T00:00:00.000Z") },
      update: { $set: { price } },
      upsert: true,
    },
  }));

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
