/**
 * Booking Notification Service
 *
 * Fire-and-forget email notifications for booking events.
 * Uses sendEmailBackground — never blocks or throws.
 */

import { sendEmailBackground } from "../../shared/Email/sendEmails.js";
import {
  bookingConfirmationEmailHTML,
  newBookingAlertEmailHTML,
  bookingStatusUpdateEmailHTML,
} from "../../shared/Email/emailHtml.js";
import { UserModel } from "../user/user.model.js";

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Format a Date or ISO string to YYYY-MM-DD for display in emails.
 */
function fmtDate(d) {
  if (!d) return "N/A";
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString().slice(0, 10);
}

/**
 * Format a snake_case enum value into a human-readable label.
 * e.g. "free_cancellation" → "Free Cancellation"
 */
function humanize(str) {
  if (!str) return "N/A";
  return str
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Collect unique email addresses to send to.
 * Primary: guestDetails.email
 * Fallback: client user's email (if different from guestDetails.email)
 */
async function resolveGuestEmails(booking) {
  const emails = new Set();

  // Primary: guest details email
  if (booking.guestDetails?.email) {
    emails.add(booking.guestDetails.email.toLowerCase());
  }

  // Fallback: client's account email
  if (booking.client) {
    const clientId =
      typeof booking.client === "object" && booking.client._id
        ? booking.client._id
        : booking.client;
    try {
      const user = await UserModel.findById(clientId)
        .select("email")
        .lean();
      if (user?.email) {
        emails.add(user.email.toLowerCase());
      }
    } catch {
      // Non-critical — proceed with guestDetails.email
    }
  }

  return [...emails];
}

/**
 * Get all admin + staff users who have reservations.read permission.
 */
async function getStaffRecipients() {
  try {
    const users = await UserModel.find({
      $or: [
        { role: "admin" },
        { role: "staff", "permissions.reservations.read": true },
      ],
      isActive: true,
    })
      .select("email firstName")
      .lean();
    return users;
  } catch (err) {
    console.error("[BOOKING_NOTIFY] Failed to fetch staff recipients:", err.message);
    return [];
  }
}

// ─── Notification Functions ─────────────────────────────────────

/**
 * Notify guest that their booking is confirmed.
 * Sent after successful payment (webhook) or for pay_at_hotel bookings.
 */
export async function notifyGuestBookingConfirmed(booking, roomTypeName) {
  const emails = await resolveGuestEmails(booking);
  if (emails.length === 0) return;

  const pb = booking.priceBreakdown || {};
  const html = bookingConfirmationEmailHTML({
    guestName: `${booking.guestDetails?.firstName || ""} ${booking.guestDetails?.lastName || ""}`.trim() || "Guest",
    bookingNumber: booking.bookingNumber,
    roomTypeName: roomTypeName || "Room",
    checkIn: fmtDate(booking.checkIn),
    checkOut: fmtDate(booking.checkOut),
    nights: booking.nights,
    guests: booking.guests,
    reservationOption: humanize(booking.reservationOption?.type),
    cancellationPolicy: humanize(booking.cancellationPolicy?.type),
    subtotal: pb.subtotal || 0,
    taxes: pb.taxes || 0,
    loyaltyDiscount: pb.loyaltyDiscount || 0,
    tierDiscount: pb.tierDiscount || 0,
    grandTotal: pb.grandTotal || 0,
    specialRequests: booking.specialRequests || "",
  });

  for (const email of emails) {
    sendEmailBackground({
      email,
      subject: `Booking Confirmed — #${booking.bookingNumber}`,
      message: html,
    });
  }
}

/**
 * Notify admins and staff (with reservations.read) about a new booking.
 */
export async function notifyStaffNewBooking(booking, roomTypeName, isManual = false) {
  const staffUsers = await getStaffRecipients();
  if (staffUsers.length === 0) return;

  const pb = booking.priceBreakdown || {};
  const html = newBookingAlertEmailHTML({
    bookingNumber: booking.bookingNumber,
    guestName: `${booking.guestDetails?.firstName || ""} ${booking.guestDetails?.lastName || ""}`.trim() || "Guest",
    guestEmail: booking.guestDetails?.email || "N/A",
    roomTypeName: roomTypeName || "Room",
    checkIn: fmtDate(booking.checkIn),
    checkOut: fmtDate(booking.checkOut),
    nights: booking.nights,
    grandTotal: pb.grandTotal || 0,
    paymentOption: humanize(booking.paymentOption?.type),
    isManual,
  });

  for (const staff of staffUsers) {
    sendEmailBackground({
      email: staff.email,
      subject: `New Booking — #${booking.bookingNumber}`,
      message: html,
    });
  }
}

/**
 * Notify guest when their booking status changes.
 */
export async function notifyGuestStatusChanged(booking, roomTypeName, oldStatus, newStatus, note) {
  const emails = await resolveGuestEmails(booking);
  if (emails.length === 0) return;

  const html = bookingStatusUpdateEmailHTML({
    guestName: `${booking.guestDetails?.firstName || ""} ${booking.guestDetails?.lastName || ""}`.trim() || "Guest",
    bookingNumber: booking.bookingNumber,
    roomTypeName: roomTypeName || "Room",
    checkIn: fmtDate(booking.checkIn),
    checkOut: fmtDate(booking.checkOut),
    oldStatus,
    newStatus,
    note: note || "",
  });

  for (const email of emails) {
    sendEmailBackground({
      email,
      subject: `Booking #${booking.bookingNumber} — Status: ${humanize(newStatus)}`,
      message: html,
    });
  }
}
