import { query } from "express-validator";
import { validatorMiddleware } from "../../shared/middlewares/validatorMiddleware.js";

export const getDashboardValidator = [
  query("startDate")
    .optional()
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage("startDate must be a valid date (YYYY-MM-DD)"),

  query("endDate")
    .optional()
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage("endDate must be a valid date (YYYY-MM-DD)"),

  query("recentBookingsLimit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("recentBookingsLimit must be an integer between 1 and 50"),

  validatorMiddleware,
];
