import { body, param } from "express-validator";
import { validatorMiddleware } from "../../shared/middlewares/validatorMiddleware.js";

export const updateConfigValidator = [
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be boolean"),
  body("tiers")
    .optional()
    .isArray({ min: 1 })
    .withMessage("tiers must be a non-empty array"),
  body("tiers.*.name")
    .if(body("tiers").exists())
    .notEmpty()
    .withMessage("Each tier must have a name")
    .isString()
    .trim()
    .toLowerCase(),
  body("tiers.*.discountRate")
    .if(body("tiers").exists())
    .notEmpty()
    .withMessage("Each tier must have a discountRate")
    .isFloat({ min: 0, max: 1 })
    .withMessage("discountRate must be between 0 and 1"),
  body("tiers.*.minSpent")
    .if(body("tiers").exists())
    .notEmpty()
    .withMessage("Each tier must have a minSpent")
    .isFloat({ min: 0 })
    .withMessage("minSpent must be >= 0"),
  validatorMiddleware,
];

export const getUserTierValidator = [
  param("userId").isMongoId().withMessage("Invalid userId"),
  validatorMiddleware,
];
