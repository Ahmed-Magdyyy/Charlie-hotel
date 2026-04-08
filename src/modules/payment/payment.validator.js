import { body, param, query } from "express-validator";
import { validatorMiddleware } from "../../shared/middlewares/validatorMiddleware.js";

export const initiatePaymentValidator = [
  body("bookingId")
    .notEmpty()
    .withMessage("bookingId is required")
    .isMongoId()
    .withMessage("Invalid booking ID"),
  validatorMiddleware,
];

export const getPaymentValidator = [
  param("bookingId").isMongoId().withMessage("Invalid booking ID"),
  validatorMiddleware,
];

export const refundPaymentValidator = [
  param("paymentId").isMongoId().withMessage("Invalid payment ID"),
  validatorMiddleware,
];

export const collectPaymentValidator = [
  param("bookingId").isMongoId().withMessage("Invalid booking ID"),
  validatorMiddleware,
];

export const listPaymentsValidator = [
  query("status")
    .optional()
    .isIn(["initiated", "paid", "failed", "refunded"])
    .withMessage("Invalid status filter"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100"),
  validatorMiddleware,
];
