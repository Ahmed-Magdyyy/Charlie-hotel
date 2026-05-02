import asyncHandler from "express-async-handler";
import {
  calculateBookingService,
  createBookingService,
  createManualBookingService,
  getBookingByIdService,
  getMyBookingsService,
  getAllBookingsService,
  cancelBookingService,
  updateBookingStatusService,
} from "./booking.service.js";
import { t } from "../../shared/i18n/index.js";

// POST /api/v1/bookings/calculate
export const calculateBooking = asyncHandler(async (req, res) => {
  const currency = req.query.currency || "SAR";
  const data = await calculateBookingService(req.body, req.user || null, req.lang, currency);
  res.status(200).json({ status: "success", data });
});

// POST /api/v1/bookings
export const createBooking = asyncHandler(async (req, res) => {
  const booking = await createBookingService(req.body, req.user, req.lang);
  res.status(201).json({
    status: "success",
    message: t("booking.BOOKING_CREATED", req.lang),
    data: booking,
  });
});

// POST /api/v1/bookings/manual
export const createManualBooking = asyncHandler(async (req, res) => {
  const booking = await createManualBookingService(req.body, req.user, req.lang);
  res.status(201).json({
    status: "success",
    message: t("booking.BOOKING_CREATED", req.lang),
    data: booking,
  });
});

// GET /api/v1/bookings/my
export const getMyBookings = asyncHandler(async (req, res) => {
  const data = await getMyBookingsService(req.user, req.query, req.lang);
  res.status(200).json({ status: "success", ...data });
});

// GET /api/v1/bookings
export const getAllBookings = asyncHandler(async (req, res) => {
  const data = await getAllBookingsService(req.query, req.lang);
  res.status(200).json({ status: "success", ...data });
});

// GET /api/v1/bookings/:bookingId
export const getBooking = asyncHandler(async (req, res) => {
  const currency = req.query.currency || "SAR";
  const booking = await getBookingByIdService(
    req.params.bookingId,
    req.user,
    req.lang,
    currency,
  );
  res.status(200).json({ status: "success", data: booking });
});

// PATCH /api/v1/bookings/:bookingId/cancel
export const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await cancelBookingService(
    req.params.bookingId,
    req.user,
    req.lang,
  );
  res.status(200).json({
    status: "success",
    message: t("booking.BOOKING_CANCELLED", req.lang),
    data: booking,
  });
});

// PATCH /api/v1/bookings/:bookingId/status
export const updateBookingStatus = asyncHandler(async (req, res) => {
  const booking = await updateBookingStatusService(
    req.params.bookingId,
    req.body,
    req.user,
    req.lang,
  );
  res.status(200).json({
    status: "success",
    message: t("booking.BOOKING_STATUS_UPDATED", req.lang, {
      status: booking.status,
    }),
    data: booking,
  });
});
