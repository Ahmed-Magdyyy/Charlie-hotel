import { RoomAvailabilityModel } from "./roomAvailability.model.js";

/**
 * Find availability records for a room type within a date range.
 */
export async function findAvailabilityByRoomTypeAndDateRange(
  roomTypeId,
  startDate,
  endDate,
) {
  return RoomAvailabilityModel.find({
    roomType: roomTypeId,
    date: { $gte: startDate, $lte: endDate },
  })
    .sort({ date: 1 })
    .lean();
}

/**
 * Bulk upsert availability for a room type across a date range.
 * Sets totalRooms and optionally isBlocked for each date.
 */
export async function upsertAvailabilityForDateRange(
  roomTypeId,
  startDate,
  endDate,
  { totalRooms, isBlocked },
) {
  const ops = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const date = new Date(current);
    const update = {};
    if (totalRooms !== undefined) update.totalRooms = totalRooms;
    if (isBlocked !== undefined) update.isBlocked = isBlocked;

    ops.push({
      updateOne: {
        filter: { roomType: roomTypeId, date },
        update: { $set: update },
        upsert: true,
      },
    });
    current.setUTCDate(current.getUTCDate() + 1);
  }

  if (ops.length === 0) return { modifiedCount: 0, upsertedCount: 0 };

  return RoomAvailabilityModel.bulkWrite(ops);
}

/**
 * Atomically increment bookedRooms for a single date (used by booking module).
 * Returns null if the room is blocked or fully booked — caller must abort.
 */
export async function incrementBookedRooms(roomTypeId, date, session) {
  return RoomAvailabilityModel.findOneAndUpdate(
    {
      roomType: roomTypeId,
      date,
      isBlocked: false,
      $expr: { $gt: [{ $subtract: ["$totalRooms", "$bookedRooms"] }, 0] },
    },
    { $inc: { bookedRooms: 1 } },
    { new: true, session },
  );
}

/**
 * Atomically decrement bookedRooms for a single date (used when cancelling a booking).
 */
export async function decrementBookedRooms(roomTypeId, date, session) {
  return RoomAvailabilityModel.findOneAndUpdate(
    {
      roomType: roomTypeId,
      date,
      bookedRooms: { $gt: 0 },
    },
    { $inc: { bookedRooms: -1 } },
    { new: true, session },
  );
}

/**
 * Search for room types that are available every night in a date range.
 * Returns roomType IDs that have availability > 0 for ALL nights.
 */
export async function findAvailableRoomTypeIds(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalNights = Math.round((end - start) / (1000 * 60 * 60 * 24));

  if (totalNights <= 0) return [];

  return RoomAvailabilityModel.aggregate([
    {
      $match: {
        date: { $gte: start, $lt: end },
        isBlocked: false,
        $expr: { $gt: [{ $subtract: ["$totalRooms", "$bookedRooms"] }, 0] },
      },
    },
    {
      $group: {
        _id: "$roomType",
        availableNights: { $sum: 1 },
      },
    },
    {
      $match: {
        availableNights: totalNights,
      },
    },
    {
      $project: { _id: 1 },
    },
  ]);
}
