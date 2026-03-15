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
  body("price")
    .notEmpty()
    .withMessage("price is required")
    .isFloat({ min: 0 })
    .withMessage("price must be a positive number"),
  validatorMiddleware,
];
