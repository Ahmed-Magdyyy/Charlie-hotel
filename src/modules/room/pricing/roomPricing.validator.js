import { param, body, query } from "express-validator";
import { validatorMiddleware } from "../../../shared/middlewares/validatorMiddleware.js";

export const getPricingValidator = [
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

export const bulkSetPricingValidator = [
  param("roomTypeId").isMongoId().withMessage("Invalid room type ID"),
  body("entries")
    .isArray({ min: 1 })
    .withMessage("entries must be a non-empty array"),
  body("entries.*.date")
    .notEmpty()
    .withMessage("Each entry must have a date")
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage("Each date must be a valid date (YYYY-MM-DD)"),
  body("entries.*.price")
    .notEmpty()
    .withMessage("Each entry must have a price")
    .isFloat({ min: 0 })
    .withMessage("Each price must be a non-negative number"),
  validatorMiddleware,
];
