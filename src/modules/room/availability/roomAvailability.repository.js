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
 * If no record exists, creates one with totalRooms from the room type.
 * Returns null if the room is blocked or fully booked — caller must abort.
 */
export async function incrementBookedRooms(roomTypeId, date, totalRoomCount, session) {
  // First try to increment an existing record
  const result = await RoomAvailabilityModel.findOneAndUpdate(
    {
      roomType: roomTypeId,
      date,
      isBlocked: false,
      $expr: { $gt: [{ $subtract: ["$totalRooms", "$bookedRooms"] }, 0] },
    },
    { $inc: { bookedRooms: 1 } },
    { new: true, session },
  );

  if (result) return result;

  // If no record exists, create one with defaults (only if not already existing & full)
  const existing = await RoomAvailabilityModel.findOne(
    { roomType: roomTypeId, date },
    null,
    { session },
  ).lean();

  // Record exists but is blocked or full — not available
  if (existing) return null;

  // No record at all — create with defaults, 1 booked
  if (totalRoomCount <= 0) return null;

  try {
    const doc = await RoomAvailabilityModel.create(
      [{ roomType: roomTypeId, date, totalRooms: totalRoomCount, bookedRooms: 1 }],
      { session },
    );
    return doc[0];
  } catch {
    // Race condition: another transaction created it first
    return null;
  }
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
 * Find room type IDs that are explicitly blocked or fully booked on ANY night in a range.
 * Used to exclude them from the "available by default" list.
 */
export async function findUnavailableRoomTypeIds(startDate, endDate) {
  return RoomAvailabilityModel.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lt: endDate },
        $or: [
          { isBlocked: true },
          { $expr: { $lte: [{ $subtract: ["$totalRooms", "$bookedRooms"] }, 0] } },
        ],
      },
    },
    {
      $group: {
        _id: {
          roomType: "$roomType",
          date: "$date",
        },
      },
    },
    {
      $group: {
        _id: "$_id.roomType",
        unavailableDates: { $push: "$_id.date" },
      },
    },
  ]);
}
