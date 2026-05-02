import { param, body, query } from "express-validator";
import { validatorMiddleware } from "../../../shared/middlewares/validatorMiddleware.js";
import { supportedCurrencies } from "../../../shared/constants/enums.js";

export const getAvailabilityValidator = [
  param("roomTypeId").isMongoId().withMessage("Invalid room type ID"),
  query("startDate")
    .optional()
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage("startDate must be a valid date (YYYY-MM-DD)"),
  query("endDate")
    .optional()
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage("endDate must be a valid date (YYYY-MM-DD)"),
  validatorMiddleware,
];

export const blockRoomsValidator = [
  param("roomTypeId").isMongoId().withMessage("Invalid room type ID"),
  body("startDate")
    .notEmpty()
    .withMessage("startDate is required")
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage("startDate must be a valid date (YYYY-MM-DD)"),
  body("endDate")
    .notEmpty()
    .withMessage("endDate is required")
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage("endDate must be a valid date (YYYY-MM-DD)"),
  body("blockedRooms")
    .notEmpty()
    .withMessage("blockedRooms is required")
    .isInt({ min: 0 })
    .withMessage("blockedRooms must be a non-negative integer"),
  validatorMiddleware,
];

export const searchAvailabilityValidator = [
  query("checkIn")
    .notEmpty()
    .withMessage("checkIn is required")
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage("checkIn must be a valid date (YYYY-MM-DD)"),
  query("checkOut")
    .notEmpty()
    .withMessage("checkOut is required")
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage("checkOut must be a valid date (YYYY-MM-DD)"),
  query("guests")
    .optional()
    .isInt({ min: 1 })
    .withMessage("guests must be a positive integer"),
  query("currency")
    .optional()
    .toUpperCase()
    .isIn(supportedCurrencies)
    .withMessage(`currency must be one of: ${supportedCurrencies.join(", ")}`),
  validatorMiddleware,
];
