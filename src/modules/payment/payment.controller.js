import asyncHandler from "express-async-handler";
import {
  initiatePaymentService,
  handleWebhookService,
  getPaymentByBookingService,
  refundPaymentService,
  markPayAtHotelPaidService,
  getAllPaymentsService,
  getOnePaymentService,
} from "./payment.service.js";
import { t } from "../../shared/i18n/index.js";

// POST /api/v1/payments/initiate
export const initiatePayment = asyncHandler(async (req, res) => {
  const data = await initiatePaymentService(req.body, req.user, req.lang);
  res.status(200).json({
    status: "success",
    message: t("payment.PAYMENT_INITIATED", req.lang),
    data,
  });
});

// POST /api/v1/payments/webhook
export const paymentWebhook = asyncHandler(async (req, res) => {
  const result = await handleWebhookService(req.body);
  res.status(200).json(result);
});

// GET /api/v1/payments/:bookingId
export const getPaymentByBooking = asyncHandler(async (req, res) => {
  const payments = await getPaymentByBookingService(
    req.params.bookingId,
    req.user,
    req.lang,
  );
  res.status(200).json({ status: "success", data: payments });
});

// POST /api/v1/payments/:paymentId/refund
export const refundPayment = asyncHandler(async (req, res) => {
  const result = await refundPaymentService(
    req.params.paymentId,
    req.user,
    req.lang,
  );
  res.status(200).json({
    status: "success",
    message: t("payment.REFUND_SUCCESS", req.lang),
    data: result,
  });
});

// PATCH /api/v1/payments/:bookingId/collect
export const markPayAtHotelPaid = asyncHandler(async (req, res) => {
  const data = await markPayAtHotelPaidService(
    req.params.bookingId,
    req.user,
    req.lang,
  );
  res.status(200).json({
    status: "success",
    message: t("payment.PAYMENT_COLLECTED", req.lang),
    data,
  });
});

// GET /api/v1/payments
export const getAllPayments = asyncHandler(async (req, res) => {
  const data = await getAllPaymentsService(req.query, req.lang);
  res.status(200).json({ status: "success", ...data });
});

// GET /api/v1/payments/admin/:paymentId
export const getOnePayment = asyncHandler(async (req, res) => {
  const data = await getOnePaymentService(req.params.paymentId, req.lang);
  res.status(200).json({ status: "success", data });
});
