import { Router } from "express";
import * as authController from "./auth.controller.js";
import * as validators from "./auth.validator.js";
import { protect } from "./auth.middleware.js";

const router = Router();

// Public auth routes
router.post("/signup", validators.signupValidator, authController.signup);
router.post(
  "/verify-email",
  validators.verifyEmailValidator,
  authController.verifyEmail,
);
router.post(
  "/resend-otp",
  validators.resendOtpValidator,
  authController.resendOtp,
);
router.post("/login", validators.loginValidator, authController.login);
router.post(
  "/forgot-password",
  validators.forgetPasswordValidator,
  authController.forgetPassword,
);
router.post(
  "/verify-reset-code",
  validators.verifyResetCodeValidator,
  authController.verifyResetCode,
);
router.patch(
  "/reset-password",
  validators.resetPasswordValidator,
  authController.resetPassword,
);
router.post("/refresh-token", authController.refreshToken);
router.post("/logout", authController.logout);

export default router;
