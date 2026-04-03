import { body, param } from "express-validator";
import { validatorMiddleware } from "../../../shared/middlewares/validatorMiddleware.js";

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

  // beds, amenities, views, smokingPolicy, accessibilityFeatures,
  // reservationOptions, cancellationPolicies, paymentOptions
  // are sent as JSON strings — validated and parsed in the service layer

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
