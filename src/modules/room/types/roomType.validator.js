import { body, param } from "express-validator";
import { validatorMiddleware } from "../../../shared/middlewares/validatorMiddleware.js";
import { t } from "../../../shared/i18n/index.js";

/**
 * Parse a JSON-string value into an array.
 * Returns the parsed array or false if invalid.
 */
function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) return false;
      return parsed;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Custom validator: value must be a valid JSON array with ≥ 1 item.
 */
function isNonEmptyJsonArray(value) {
  const arr = parseJsonArray(value);
  return arr !== false && arr.length >= 1;
}

/**
 * Required JSON-array field (create): must be present and have ≥ 1 item.
 */
function requiredJsonArray(field, i18nPrefix) {
  return body(field)
    .notEmpty()
    .withMessage((value, { req }) =>
      t(`room.${i18nPrefix}_REQUIRED`, req.lang),
    )
    .custom(isNonEmptyJsonArray)
    .withMessage((value, { req }) =>
      t(`room.${i18nPrefix}_REQUIRED`, req.lang),
    );
}

/**
 * Optional JSON-array field (update): skipped if not sent,
 * but if provided must have ≥ 1 item.
 */
function optionalJsonArray(field, i18nPrefix) {
  return body(field)
    .optional()
    .custom(isNonEmptyJsonArray)
    .withMessage((value, { req }) =>
      t(`room.${i18nPrefix}_REQUIRED`, req.lang),
    );
}

export const createRoomTypeValidator = [
  body("name_en")
    .trim()
    .notEmpty()
    .withMessage("English name is required")
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters"),

  body("name_ar").optional().trim(),

  body("description_en").optional().trim(),
  body("description_ar").optional().trim(),

  body("maxGuests")
    .notEmpty()
    .withMessage("Max guests is required")
    .isInt({ min: 1 })
    .withMessage("Max guests must be at least 1"),

  body("roomSize")
    .optional()
    .isFloat({ min: 1 })
    .withMessage("Room size must be a positive number (sqm)"),

  body("basePrice")
    .notEmpty()
    .withMessage("Base price is required")
    .isFloat({ min: 0 })
    .withMessage("Base price must be 0 or more"),

  // ─── Required array fields (sent as JSON strings) ─────────

  requiredJsonArray("reservationOptions", "RESERVATION_OPTIONS"),
  requiredJsonArray("cancellationPolicies", "CANCELLATION_POLICIES"),
  requiredJsonArray("paymentOptions", "PAYMENT_OPTIONS"),

  body("totalRoomCount")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Total room count must be 0 or more"),

  validatorMiddleware,
];

export const updateRoomTypeValidator = [
  param("roomTypeId").isMongoId().withMessage("Invalid room type id"),

  body("name_en")
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters"),

  body("name_ar").optional().trim(),
  body("description_en").optional().trim(),
  body("description_ar").optional().trim(),

  body("maxGuests")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Max guests must be at least 1"),

  body("roomSize")
    .optional()
    .isFloat({ min: 1 })
    .withMessage("Room size must be a positive number (sqm)"),

  body("basePrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Base price must be 0 or more"),

  // ─── Optional on update, but if provided must have ≥ 1 item ──

  optionalJsonArray("reservationOptions", "RESERVATION_OPTIONS"),
  optionalJsonArray("cancellationPolicies", "CANCELLATION_POLICIES"),
  optionalJsonArray("paymentOptions", "PAYMENT_OPTIONS"),

  body("totalRoomCount")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Total room count must be 0 or more"),

  body("isActive").optional().isBoolean(),

  validatorMiddleware,
];

export const getRoomTypeValidator = [
  param("roomTypeId").isMongoId().withMessage("Invalid room type id"),
  validatorMiddleware,
];
