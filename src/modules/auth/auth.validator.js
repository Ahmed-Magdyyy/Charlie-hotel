import { body } from "express-validator";
import { validatorMiddleware } from "../../shared/middlewares/validatorMiddleware.js";

export const signupValidator = [
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

  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address"),

  body("phone")
    .notEmpty()
    .withMessage("Phone is required")
    .isLength({ min: 6 })
    .withMessage("Phone must be at least 6 characters")
    .isMobilePhone("any")
    .withMessage("Invalid phone number"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\s]{6,}$/)
    .withMessage("Password must contain uppercase, lowercase, and number"),

  body("cPassword")
    .notEmpty()
    .withMessage("Password confirmation is required")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Password confirmation does not match");
      }
      return true;
    }),

  validatorMiddleware,
];

export const resendOtpValidator = [
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address"),

  validatorMiddleware,
];

export const verifyEmailValidator = [
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address"),

  body("otp")
    .notEmpty()
    .withMessage("OTP is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits")
    .matches(/^[0-9]+$/)
    .withMessage("OTP must be numeric"),

  validatorMiddleware,
];

export const loginValidator = [
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),

  validatorMiddleware,
];

export const forgetPasswordValidator = [
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address"),

  validatorMiddleware,
];

export const verifyResetCodeValidator = [
  body("resetCode")
    .notEmpty()
    .withMessage("Reset code is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("Reset code must be 6 digits")
    .matches(/^[0-9]+$/)
    .withMessage("Reset code must be numeric"),

  validatorMiddleware,
];

export const resetPasswordValidator = [
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address"),

  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\s]{6,}$/)
    .withMessage("Password must contain uppercase, lowercase, and number"),

  body("cNewPassword")
    .notEmpty()
    .withMessage("Password confirmation is required")
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error("Password confirmation does not match");
      }
      return true;
    }),

  validatorMiddleware,
];
