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
  res.status(200).json({
    status: "success",
    data: {
      paymentStatus: isPaid ? "paid" : "failed",
      message: isPaid ? "Payment completed successfully" : message || "Payment failed",
      invoiceId: invoice_id || id,
    },
  });
});

// AlinmaPay sends an encrypted POST to merchantResponseUrl after payment
// This is the success callback — it also needs to be processed as a webhook
router.post("/callback", async (req, res) => {
  try {
    const result = await handleWebhookService(req.body);
    // Extract payment status from the result for client-facing response
    res.status(200).json({
      status: "success",
      data: {
        paymentStatus: result.acknowledged ? "paid" : "failed",
        message: "Payment processed successfully",
      },
    });
  } catch {
    res.status(200).json({
      status: "success",
      data: {
        paymentStatus: "failed",
        message: "Payment processing encountered an error",
      },
    });
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
