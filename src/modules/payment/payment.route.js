import { Router } from "express";
import { protect, requirePermission } from "../auth/auth.middleware.js";
import {
  initiatePayment,
  paymentWebhook,
  getPaymentByBooking,
  refundPayment,
  markPayAtHotelPaid,
  getAllPayments,
} from "./payment.controller.js";
import {
  initiatePaymentValidator,
  getPaymentValidator,
  refundPaymentValidator,
  collectPaymentValidator,
  listPaymentsValidator,
} from "./payment.validator.js";

const router = Router();

// ─── Public (gateway webhook — no auth) ─────────────────────
router.post("/webhook", paymentWebhook);

// ─── Authenticated ──────────────────────────────────────────
router.use(protect);

// Client initiates payment
router.post("/initiate", initiatePaymentValidator, initiatePayment);

// Get payments for a booking (owner or staff/admin)
router.get("/:bookingId", getPaymentValidator, getPaymentByBooking);

// Admin-only
router.get(
  "/",
  requirePermission("reservations", "read"),
  listPaymentsValidator,
  getAllPayments,
);

router.patch(
  "/:bookingId/collect",
  requirePermission("reservations", "edit"),
  collectPaymentValidator,
  markPayAtHotelPaid,
);

router.post(
  "/:paymentId/refund",
  requirePermission("reservations", "edit"),
  refundPaymentValidator,
  refundPayment,
);

export default router;
