import { Router } from "express";
import { protect, requirePermission } from "../auth/auth.middleware.js";
import { handleWebhookService } from "./payment.service.js";
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
  const clientUrl = process.env.CLIENT_URL || "https://example.com";
  const params = new URLSearchParams({
    paymentStatus: isPaid ? "paid" : "failed",
    invoiceId: invoice_id || id || "",
    ...(isPaid ? {} : { message: message || "Payment failed" }),
  });
  res.redirect(`${clientUrl}/booking/confirmation?${params.toString()}`);
});

// AlinmaPay sends an encrypted POST to merchantResponseUrl after payment
// This is the success callback — it also needs to be processed as a webhook
router.post("/callback", async (req, res) => {
  const clientUrl = process.env.CLIENT_URL || "https://example.com";
  try {
    const result = await handleWebhookService(req.body);
    const params = new URLSearchParams({
      paymentStatus: result.acknowledged ? "paid" : "failed",
    });
    res.redirect(`${clientUrl}/booking/confirmation?${params.toString()}`);
  } catch {
    const params = new URLSearchParams({
      paymentStatus: "failed",
      message: "Payment processing encountered an error",
    });
    res.redirect(`${clientUrl}/booking/confirmation?${params.toString()}`);
  }
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
