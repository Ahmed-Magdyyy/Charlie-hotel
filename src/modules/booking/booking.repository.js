import { BookingModel } from "./booking.model.js";

/**
 * Generate a human-readable booking number: CH-YYYYMMDD-NNN
 */
export async function generateBookingNumber() {
  const today = new Date();
  const dateStr =
    today.getUTCFullYear().toString() +
    String(today.getUTCMonth() + 1).padStart(2, "0") +
    String(today.getUTCDate()).padStart(2, "0");

  const prefix = `CH-${dateStr}-`;

  // Count today's bookings to get next sequence
  const startOfDay = new Date(dateStr.slice(0, 4) + "-" + dateStr.slice(4, 6) + "-" + dateStr.slice(6, 8) + "T00:00:00.000Z");
  const endOfDay = new Date(startOfDay);
  endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

  const count = await BookingModel.countDocuments({
    createdAt: { $gte: startOfDay, $lt: endOfDay },
  });

  const seq = String(count + 1).padStart(3, "0");
  return prefix + seq;
}

/**
 * Create a booking document.
 */
export async function createBooking(data, session) {
  const [booking] = await BookingModel.create([data], { session });
  return booking;
}

/**
 * Find booking by ID. Optionally populate references.
 */
export async function findBookingById(id, options = {}) {
  let query = BookingModel.findById(id);
  if (options.populate) query = query.populate(options.populate);
  if (options.lean) query = query.lean();
  return query;
}

/**
 * Find booking by booking number.
 */
export async function findBookingByNumber(bookingNumber) {
  return BookingModel.findOne({ bookingNumber }).lean();
}

/**
 * Find bookings for a specific client.
 */
export async function findBookingsByClient(clientId, options = {}) {
  let query = BookingModel.find({ client: clientId }).sort({ createdAt: -1 });
  if (options.skip) query = query.skip(options.skip);
  if (options.limit) query = query.limit(options.limit);
  if (options.populate) query = query.populate(options.populate);
  if (options.lean) query = query.lean();
  return query;
}

/**
 * Count bookings for a specific client.
 */
export async function countBookingsByClient(clientId) {
  return BookingModel.countDocuments({ client: clientId });
}

/**
 * Find all bookings with filters (for admin/staff).
 */
export async function findBookings(filter = {}, options = {}) {
  let query = BookingModel.find(filter).sort(options.sort || { createdAt: -1 });
  if (options.skip) query = query.skip(options.skip);
  if (options.limit) query = query.limit(options.limit);
  if (options.populate) query = query.populate(options.populate);
  if (options.lean) query = query.lean();
  return query;
}

/**
 * Count bookings with filters.
 */
export async function countBookings(filter = {}) {
  return BookingModel.countDocuments(filter);
}

/**
 * Find expired pending bookings (for expiry job).
 */
export async function findExpiredPendingBookings() {
  return BookingModel.find({
    status: "pending",
    expiresAt: { $lt: new Date() },
  });
}

/**
 * Update booking by ID (returns the updated document).
 */
export async function updateBookingById(id, update, session) {
  return BookingModel.findByIdAndUpdate(id, update, {
    new: true,
    session,
  });
}
