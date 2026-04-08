import cron from "node-cron";
import mongoose from "mongoose";
import { findExpiredPendingBookings } from "../../modules/booking/booking.repository.js";
import { decrementBookedRoomsBatch } from "../../modules/room/availability/roomAvailability.repository.js";
import { bookingStatus } from "../constants/enums.js";

/**
 * Expires pending bookings that have passed their expiresAt deadline.
 * Runs every 5 minutes.
 *
 * For each expired booking:
 * 1. Sets status to "expired"
 * 2. Decrements bookedRooms for each night (inside a transaction)
 * 3. Logs a statusHistory entry with changedBy: null (system)
 */
async function processExpiredBookings() {
  try {
    const expired = await findExpiredPendingBookings();

    if (expired.length === 0) return;

    console.log(`[BookingExpiry] Found ${expired.length} expired booking(s)`);

    for (const booking of expired) {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Decrement bookedRooms for all nights in one batch
        const dates = [];
        const current = new Date(booking.checkIn);
        const end = new Date(booking.checkOut);
        while (current < end) {
          dates.push(new Date(current));
          current.setUTCDate(current.getUTCDate() + 1);
        }
        await decrementBookedRoomsBatch(booking.roomType, dates, session);

        // Update booking status
        booking.status = bookingStatus.EXPIRED;
        booking.statusHistory.push({
          status: bookingStatus.EXPIRED,
          changedBy: null,
          note: "Booking expired — payment not completed within deadline",
        });

        await booking.save({ session });
        await session.commitTransaction();

        console.log(`[BookingExpiry] Expired booking ${booking.bookingNumber}`);
      } catch (err) {
        if (session.inTransaction()) await session.abortTransaction();
        console.error(
          `[BookingExpiry] Failed to expire booking ${booking.bookingNumber}:`,
          err.message,
        );
      } finally {
        session.endSession();
      }
    }
  } catch (err) {
    console.error("[BookingExpiry] Job failed:", err.message);
  }
}

/**
 * Start the booking expiry cron job.
 * Runs every 5 minutes.
 */
export function startBookingExpiryJob() {
  cron.schedule("*/5 * * * *", processExpiredBookings);
  console.log("[BookingExpiry] Cron job started — runs every 5 minutes");
}
