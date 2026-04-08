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
 * Bulk upsert blockedRooms for a room type across a date range.
 */
export async function upsertBlockedRoomsForDateRange(
  roomTypeId,
  startDate,
  endDate,
  blockedRooms,
) {
  const ops = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const date = new Date(current);
    ops.push({
      updateOne: {
        filter: { roomType: roomTypeId, date },
        update: { $set: { blockedRooms } },
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
 * If no record exists, creates one with 1 booked.
 * Returns null if fully booked or blocked — caller must abort.
 *
 * available = totalRoomCount - bookedRooms - blockedRooms
 */
export async function incrementBookedRooms(roomTypeId, date, totalRoomCount, session) {
  // Try to increment an existing record where there's still availability
  const result = await RoomAvailabilityModel.findOneAndUpdate(
    {
      roomType: roomTypeId,
      date,
      $expr: {
        $gt: [
          { $subtract: [totalRoomCount, { $add: ["$bookedRooms", "$blockedRooms"] }] },
          0,
        ],
      },
    },
    { $inc: { bookedRooms: 1 } },
    { returnDocument: "after", session },
  );

  if (result) return result;

  // Check if record exists but is full/blocked
  const existing = await RoomAvailabilityModel.findOne(
    { roomType: roomTypeId, date },
    null,
    { session },
  ).lean();

  if (existing) return null;

  // No record — create with defaults, 1 booked
  if (totalRoomCount <= 0) return null;

  try {
    const doc = await RoomAvailabilityModel.create(
      [{ roomType: roomTypeId, date, bookedRooms: 1, blockedRooms: 0 }],
      { session },
    );
    return doc[0];
  } catch {
    return null;
  }
}

/**
 * Batch increment bookedRooms for multiple dates in one round-trip.
 * First ensures records exist (upserts missing ones), then increments all atomically.
 * Returns false if any night is fully booked/blocked — caller must abort.
 */
export async function incrementBookedRoomsBatch(roomTypeId, dates, totalRoomCount, session) {
  if (totalRoomCount <= 0) return false;

  // Step 1: Upsert all dates in one bulkWrite (creates missing records with 0 booked)
  const upsertOps = dates.map((date) => ({
    updateOne: {
      filter: { roomType: roomTypeId, date },
      update: { $setOnInsert: { bookedRooms: 0, blockedRooms: 0 } },
      upsert: true,
    },
  }));
  await RoomAvailabilityModel.bulkWrite(upsertOps, { session });

  // Step 2: Increment all dates that have availability in one bulkWrite
  const incOps = dates.map((date) => ({
    updateOne: {
      filter: {
        roomType: roomTypeId,
        date,
        $expr: {
          $gt: [
            { $subtract: [totalRoomCount, { $add: ["$bookedRooms", "$blockedRooms"] }] },
            0,
          ],
        },
      },
      update: { $inc: { bookedRooms: 1 } },
    },
  }));
  const result = await RoomAvailabilityModel.bulkWrite(incOps, { session });

  // If any night wasn't updated, it means that night is fully booked/blocked
  return result.modifiedCount === dates.length;
}

/**
 * Batch decrement bookedRooms for multiple dates in one round-trip.
 */
export async function decrementBookedRoomsBatch(roomTypeId, dates, session) {
  const ops = dates.map((date) => ({
    updateOne: {
      filter: { roomType: roomTypeId, date, bookedRooms: { $gt: 0 } },
      update: { $inc: { bookedRooms: -1 } },
    },
  }));
  if (ops.length === 0) return;
  await RoomAvailabilityModel.bulkWrite(ops, { session });
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
    { returnDocument: "after", session },
  );
}

/**
 * Find room type IDs that are unavailable (fully booked + blocked >= totalRoomCount)
 * on ANY night in a range. Used to exclude from search results.
 *
 * We pass totalRoomCount per room type from the caller via a lookup,
 * but since we don't know it here, we return all records with issues
 * and let the service layer filter with totalRoomCount.
 */
export async function findAvailabilityRecordsInRange(startDate, endDate) {
  return RoomAvailabilityModel.find({
    date: { $gte: startDate, $lt: endDate },
  })
    .sort({ roomType: 1, date: 1 })
    .lean();
}
