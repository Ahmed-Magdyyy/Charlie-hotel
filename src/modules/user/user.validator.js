import { body, param } from "express-validator";
import { validatorMiddleware } from "../../shared/middlewares/validatorMiddleware.js";
import { roles } from "../../shared/constants/enums.js";

// Basic phone number regex, adapt as needed per country
const phoneRegex = /^(?:\+20|20|0)?1[0125]\d{8}$/;

export const createUserValidator = [
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ min: 2 })
    .withMessage("First name must be at least 2 characters"),

  body("lastName")
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ min: 2 })
    .withMessage("Last name must be at least 2 characters"),

  body("email").optional().isEmail().withMessage("Invalid email address"),

  body("phone")
    .optional()
    .matches(phoneRegex)
    .withMessage("Phone must be a valid mobile number"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),

  body("role")
    .optional()
    .isIn(Object.values(roles))
    .withMessage("Invalid role"),

  body("position").optional().isString(),

  body("permissions")
    .optional()
    .isObject()
    .withMessage("Permissions must be an object"),

  body("addresses")
    .optional()
    .isArray()
    .withMessage("Addresses must be an array"),

  body("addresses.*.country")
    .trim()
    .notEmpty()
    .withMessage("Country is required for each address"),

  body("addresses.*.city")
    .trim()
    .notEmpty()
    .withMessage("City is required for each address"),

  body("addresses.*.address")
    .trim()
    .notEmpty()
    .withMessage("Address text is required for each address"),

  validatorMiddleware,
];

export const updateUserValidator = [
  param("id").isMongoId().withMessage("Invalid user id"),

  body("firstName")
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage("First name must be at least 2 characters"),

  body("lastName")
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage("Last name must be at least 2 characters"),

  body("phone")
    .optional()
    .matches(phoneRegex)
    .withMessage("Phone must be a valid mobile number"),

  body("email").optional().isEmail().withMessage("Invalid email address"),

  body("role")
    .optional()
    .isIn(Object.values(roles))
    .withMessage("Invalid role"),

  body("position").optional().isString(),

  body("permissions")
    .optional()
    .isObject()
    .withMessage("Permissions must be an object"),

  body("addresses")
    .optional()
    .isArray()
    .withMessage("Addresses must be an array"),

  body("addresses.*.country")
    .trim()
    .notEmpty()
    .withMessage("Country is required for each address"),

  body("addresses.*.city")
    .trim()
    .notEmpty()
    .withMessage("City is required for each address"),

  body("addresses.*.address")
    .trim()
    .notEmpty()
    .withMessage("Address text is required for each address"),

  validatorMiddleware,
];

export const updateLoggedUserPasswordValidator = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),

  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),

  validatorMiddleware,
];

export const updateLoggedUserDataValidator = [
  body("email").optional().isEmail().withMessage("Invalid email address"),

  body("phone")
    .optional()
    .matches(phoneRegex)
    .withMessage("Phone must be a valid mobile number"),

  body("firstName")
    .optional()
    .isLength({ min: 2 })
    .withMessage("First name must be at least 2 characters"),

  body("lastName")
    .optional()
    .isLength({ min: 2 })
    .withMessage("Last name must be at least 2 characters"),

  body("preferredLanguage")
    .optional()
    .isIn(["en", "ar"])
    .withMessage("Language must be en or ar"),

  body("addresses")
    .optional()
    .isArray()
    .withMessage("Addresses must be an array"),

  body("addresses.*.country")
    .trim()
    .notEmpty()
    .withMessage("Country is required for each address"),

  body("addresses.*.city")
    .trim()
    .notEmpty()
    .withMessage("City is required for each address"),

  body("addresses.*.address")
    .trim()
    .notEmpty()
    .withMessage("Address text is required for each address"),

  validatorMiddleware,
];

export const updateUserActiveValidator = [
  param("id").isMongoId().withMessage("Invalid user id"),
  validatorMiddleware,
];
