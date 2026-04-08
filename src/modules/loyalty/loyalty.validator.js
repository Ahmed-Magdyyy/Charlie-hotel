import { body, param } from "express-validator";
import { validatorMiddleware } from "../../shared/middlewares/validatorMiddleware.js";

export const updateConfigValidator = [
  body("earnRate")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("earnRate must be >= 0"),
  body("redeemRate")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("redeemRate must be >= 0"),
  body("minRedeemPoints")
    .optional()
    .isInt({ min: 0 })
    .withMessage("minRedeemPoints must be >= 0"),
  body("expiryMonths")
    .optional()
    .isInt({ min: 0 })
    .withMessage("expiryMonths must be >= 0"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be boolean"),
  validatorMiddleware,
];

export const adjustPointsValidator = [
  body("userId")
    .notEmpty()
    .withMessage("userId is required")
    .isMongoId()
    .withMessage("Invalid userId"),
  body("points")
    .notEmpty()
    .withMessage("points is required")
    .isInt()
    .withMessage("points must be an integer")
    .custom((val) => val !== 0)
    .withMessage("points cannot be zero"),
  body("reason")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("reason must be under 500 characters"),
  validatorMiddleware,
];

export const getUserLoyaltyValidator = [
  param("userId").isMongoId().withMessage("Invalid userId"),
  validatorMiddleware,
];
