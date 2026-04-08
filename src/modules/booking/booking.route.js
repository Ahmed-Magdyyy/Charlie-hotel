import { Router } from "express";
import { protect, requirePermission } from "../auth/auth.middleware.js";
import {
  calculateBooking,
  createBooking,
  createManualBooking,
  getMyBookings,
  getAllBookings,
  getBooking,
  cancelBooking,
  updateBookingStatus,
} from "./booking.controller.js";
import {
  calculateBookingValidator,
  createBookingValidator,
  createManualBookingValidator,
  getBookingValidator,
  cancelBookingValidator,
  updateBookingStatusValidator,
  listBookingsValidator,
} from "./booking.validator.js";

const router = Router();

// ─── Public ─────────────────────────────────────────────────
router.post("/calculate", calculateBookingValidator, calculateBooking);

// ─── All routes below require login ─────────────────────────
router.use(protect);

// Client routes
router.post("/", createBookingValidator, createBooking);
router.get("/my", getMyBookings);

// Staff/Admin routes
router.post(
  "/manual",
  requirePermission("reservations", "create"),
  createManualBookingValidator,
  createManualBooking,
);

router.get(
  "/",
  requirePermission("reservations", "read"),
  listBookingsValidator,
  getAllBookings,
);

// Booking-specific routes (owner or staff/admin)
router.get("/:bookingId", getBookingValidator, getBooking);

router.patch(
  "/:bookingId/cancel",
  cancelBookingValidator,
  cancelBooking,
);

router.patch(
  "/:bookingId/status",
  requirePermission("reservations", "edit"),
  updateBookingStatusValidator,
  updateBookingStatus,
);

export default router;
