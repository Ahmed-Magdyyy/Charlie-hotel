import { body, param, query } from "express-validator";
import { validatorMiddleware } from "../../shared/middlewares/validatorMiddleware.js";
import {
  bookingStatus,
  reservationOptionTypes,
  cancellationPolicyTypes,
  paymentOptionTypes,
  supportedCurrencies,
} from "../../shared/constants/enums.js";

// Shared date + option fields for calculate / create
const bookingCoreFields = [
  body("roomTypeId")
    .notEmpty()
    .withMessage("roomTypeId is required")
    .isMongoId()
    .withMessage("Invalid room type ID"),
  body("guests")
    .notEmpty()
    .withMessage("guests is required")
    .isInt({ min: 1 })
    .withMessage("guests must be at least 1"),
  body("checkIn")
    .notEmpty()
    .withMessage("checkIn is required")
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage("checkIn must be a valid date (YYYY-MM-DD)"),
  body("checkOut")
    .notEmpty()
    .withMessage("checkOut is required")
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage("checkOut must be a valid date (YYYY-MM-DD)"),
  body("reservationOption")
    .notEmpty()
    .withMessage("reservationOption is required")
    .isIn(Object.values(reservationOptionTypes))
    .withMessage("Invalid reservation option"),
  body("cancellationPolicy")
    .notEmpty()
    .withMessage("cancellationPolicy is required")
    .isIn(Object.values(cancellationPolicyTypes))
    .withMessage("Invalid cancellation policy"),
  body("paymentOption")
    .notEmpty()
    .withMessage("paymentOption is required")
    .isIn(Object.values(paymentOptionTypes))
    .withMessage("Invalid payment option"),
];

const guestDetailsFields = [
  body("guestDetails").notEmpty().withMessage("guestDetails is required"),
  body("guestDetails.firstName")
    .notEmpty()
    .withMessage("Guest first name is required")
    .trim(),
  body("guestDetails.lastName")
    .notEmpty()
    .withMessage("Guest last name is required")
    .trim(),
  body("guestDetails.email")
    .notEmpty()
    .withMessage("Guest email is required")
    .isEmail()
    .withMessage("Invalid email"),
  body("guestDetails.phone")
    .notEmpty()
    .withMessage("Guest phone is required")
    .trim(),
  body("guestDetails.nationality").optional().trim(),
];

// POST /bookings/calculate
export const calculateBookingValidator = [
  ...bookingCoreFields,
  body("loyaltyPointsToRedeem")
    .optional()
    .isInt({ min: 0 })
    .withMessage("loyaltyPointsToRedeem must be a non-negative integer"),
  query("currency")
    .optional()
    .toUpperCase()
    .isIn(supportedCurrencies)
    .withMessage(`currency must be one of: ${supportedCurrencies.join(", ")}`),
  validatorMiddleware,
];

// POST /bookings
export const createBookingValidator = [
  ...bookingCoreFields,
  ...guestDetailsFields,
  body("loyaltyPointsToRedeem")
    .optional()
    .isInt({ min: 0 })
    .withMessage("loyaltyPointsToRedeem must be a non-negative integer"),
  body("specialRequests").optional().trim(),
  validatorMiddleware,
];

// POST /bookings/manual
export const createManualBookingValidator = [
  ...bookingCoreFields,
  ...guestDetailsFields,
  body("clientId")
    .optional()
    .isMongoId()
    .withMessage("Invalid client ID"),
  body("specialRequests").optional().trim(),
  validatorMiddleware,
];

// GET /bookings/:bookingId
export const getBookingValidator = [
  param("bookingId").isMongoId().withMessage("Invalid booking ID"),
  query("currency")
    .optional()
    .toUpperCase()
    .isIn(supportedCurrencies)
    .withMessage(`currency must be one of: ${supportedCurrencies.join(", ")}`),
  validatorMiddleware,
];

// PATCH /bookings/:bookingId/cancel
export const cancelBookingValidator = [
  param("bookingId").isMongoId().withMessage("Invalid booking ID"),
  validatorMiddleware,
];

// PATCH /bookings/:bookingId/status
export const updateBookingStatusValidator = [
  param("bookingId").isMongoId().withMessage("Invalid booking ID"),
  body("status")
    .notEmpty()
    .withMessage("status is required")
    .isIn([
      bookingStatus.CONFIRMED,
      bookingStatus.CHECKED_IN,
      bookingStatus.CHECKED_OUT,
      bookingStatus.NO_SHOW,
    ])
    .withMessage("Invalid status. Allowed: confirmed, checked_in, checked_out, no_show"),
  body("note").optional().trim(),
  validatorMiddleware,
];

// GET /bookings (admin list)
export const listBookingsValidator = [
  query("status")
    .optional()
    .isIn(Object.values(bookingStatus))
    .withMessage("Invalid status filter"),
  query("paymentStatus")
    .optional()
    .isIn(["pending", "paid", "failed", "refunded"])
    .withMessage("Invalid paymentStatus filter"),
  query("roomTypeId")
    .optional()
    .isMongoId()
    .withMessage("Invalid roomTypeId filter"),
  query("q")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("q must be between 1 and 100 characters"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100"),
  query("currency")
    .optional()
    .toUpperCase()
    .isIn(supportedCurrencies)
    .withMessage(`currency must be one of: ${supportedCurrencies.join(", ")}`),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("startDate must be a valid date (YYYY-MM-DD)"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("endDate must be a valid date (YYYY-MM-DD)"),
  validatorMiddleware,
];

// GET /bookings/my (client list)
export const listMyBookingsValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100"),
  query("sort")
    .optional()
    .isIn(["newest", "oldest", "-createdAt", "createdAt"])
    .withMessage("sort must be one of: newest, oldest, -createdAt, createdAt"),
  query("currency")
    .optional()
    .toUpperCase()
    .isIn(supportedCurrencies)
    .withMessage(`currency must be one of: ${supportedCurrencies.join(", ")}`),
  validatorMiddleware,
];
