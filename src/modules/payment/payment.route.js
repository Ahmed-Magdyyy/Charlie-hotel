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

// Moyasar redirects the user's browser here after payment (GET with query params)
router.get("/callback", (req, res) => {
  const { id, status, message, invoice_id } = req.query;
  const isPaid = status === "paid";
  res.status(200).json({
    status: "success",
    data: {
      paymentStatus: isPaid ? "paid" : "failed",
      message: isPaid ? "Payment completed successfully" : message || "Payment failed",
      invoiceId: invoice_id || id,
    },
  });
});

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
