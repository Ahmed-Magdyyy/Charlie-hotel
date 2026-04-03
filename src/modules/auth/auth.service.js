import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UserModel } from "../user/user.model.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import { sendEmailBackground } from "../../shared/Email/sendEmails.js";
import {
  otpEmailHTML,
  forgetPasswordEmailHTML,
} from "../../shared/Email/emailHtml.js";
import {
  generateOtp,
  hashOtp,
  computeNextOtpSendCountToday,
} from "./otp.utils.js";
import {
  createAccessToken,
  createRefreshToken,
  getAccessTokenExpiresAt,
} from "../../shared/utils/createToken.js";
import { t } from "../../shared/i18n/index.js";
import { roles, accountStatus } from "../../shared/constants/enums.js";

// ─── Helpers ────────────────────────────────────────────────

/**
 * SHA-256 hash a refresh token for secure DB storage.
 * Unlike bcrypt (slow by design), SHA-256 is fast — perfect for
 * tokens that are already high-entropy random strings.
 */
const hashRefreshToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

/**
 * Centralized session token issuer.
 * 1. Cleans out expired refresh tokens
 * 2. Creates new access + refresh tokens
 * 3. Stores the HASHED refresh token in DB
 * 4. Caps active sessions at 5
 */
const issueSessionTokens = async (user) => {
  const now = Date.now();

  // Purge expired refresh tokens
  user.refreshTokens = (user.refreshTokens || []).filter(
    (rt) => !rt.expiresAt || rt.expiresAt.getTime() > now,
  );

  // Cap active sessions at 5 (remove oldest if at limit)
  if (user.refreshTokens.length >= 5) {
    user.refreshTokens.shift();
  }

  const accessToken = createAccessToken(user._id, user.role);
  const refreshToken = createRefreshToken(user._id);
  const hashedRefreshToken = hashRefreshToken(refreshToken);

  user.refreshTokens.push({
    token: hashedRefreshToken,
    expiresAt: new Date(now + 30 * 24 * 60 * 60 * 1000), // 30 days
  });

  await user.save();

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt: getAccessTokenExpiresAt(),
  };
};

const checkOtpRateLimit = (user, lang) => {
  const nextCount = computeNextOtpSendCountToday({
    lastSentAt: user.emailOtpLastSentAt,
    sendCountToday: user.emailOtpSendCountToday,
    now: new Date(),
  });

  if (nextCount > 10) {
    throw new ApiError(t("auth.OTP_RATE_LIMIT", lang), 429);
  }
  return nextCount;
};

// ─── Auth Service ───────────────────────────────────────────

export const authService = {
  signup: async (userData, lang) => {
    let user = await UserModel.findOne({ email: userData.email });

    if (user && user.emailVerified) {
      throw new ApiError(t("auth.EMAIL_ALREADY_EXISTS", lang), 400);
    }

    const otpCode = generateOtp();
    const hashedOtp = hashOtp(otpCode);

    // Valid for 20 mins
    const otpExpires = new Date(Date.now() + 20 * 60 * 1000);

    if (user && !user.emailVerified) {
      // Setup the rate limiting correctly
      const nextCount = checkOtpRateLimit(user, lang);

      // Update details for unverified user re-trying
      user.firstName = userData.firstName;
      user.lastName = userData.lastName;
      user.phone = userData.phone;
      user.passwordHash = userData.password; // Pre-save hooks handle hashing
      user.emailVerificationCode = hashedOtp;
      user.emailVerificationExpires = otpExpires;
      user.emailOtpLastSentAt = new Date();
      user.emailOtpSendCountToday = nextCount + 1;

      await user.save();
    } else {
      user = await UserModel.create({
        ...userData,
        passwordHash: userData.password,
        emailVerificationCode: hashedOtp,
        emailVerificationExpires: otpExpires,
        emailOtpLastSentAt: new Date(),
        emailOtpSendCountToday: 1,
      });
    }

    // Send the OTP via Email (fire-and-forget)
    sendEmailBackground({
      email: user.email,
      subject: "Welcome to Charlie Hotel - Email Verification",
      message: otpEmailHTML(user.firstName, otpCode),
    });

    return {
      message: t("auth.OTP_SENT", lang),
      email: user.email,
    };
  },

  verifyEmail: async ({ email, otp }, lang) => {
    const hashedOtp = hashOtp(otp);

    const user = await UserModel.findOne({
      email,
    });

    if (!user) {
      throw new ApiError(t("auth.USER_NOT_FOUND", lang), 404);
    }

    if (
      user.emailVerificationCode !== hashedOtp ||
      user.emailVerificationExpires < Date.now()
    ) {
      throw new ApiError(t("auth.INVALID_OR_EXPIRED_OTP", lang), 400);
    }

    user.emailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpires = undefined;

    // Auto-login upon verification — issues hashed tokens
    const { accessToken, refreshToken, accessTokenExpiresAt } =
      await issueSessionTokens(user);

    return { user, accessToken, refreshToken, accessTokenExpiresAt };
  },

  resendOtp: async ({ email }, lang) => {
    const user = await UserModel.findOne({ email });

    if (!user) {
      throw new ApiError(t("auth.USER_NOT_FOUND", lang), 404);
    }

    if (user.emailVerified) {
      throw new ApiError(t("auth.EMAIL_ALREADY_VERIFIED", lang), 400);
    }

    const nextCount = checkOtpRateLimit(user, lang);

    const otpCode = generateOtp();
    const hashedOtp = hashOtp(otpCode);
    const otpExpires = new Date(Date.now() + 20 * 60 * 1000);

    user.emailVerificationCode = hashedOtp;
    user.emailVerificationExpires = otpExpires;
    user.emailOtpLastSentAt = new Date();
    user.emailOtpSendCountToday = nextCount + 1;

    await user.save();

    sendEmailBackground({
      email: user.email,
      subject: "Charlie Hotel - Resend OTP",
      message: otpEmailHTML(user.firstName, otpCode),
    });

    return { message: t("auth.OTP_RESENT", lang) };
  },

  login: async ({ email, password }, lang) => {
    const user = await UserModel.findOne({ email }).select("+passwordHash");

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new ApiError(t("auth.INVALID_CREDENTIALS", lang), 401);
    }

    if (user.account_status === accountStatus.DELETED) {
      throw new ApiError(t("auth.ACCOUNT_DELETED", lang), 403);
    }

    if (!user.emailVerified) {
      throw new ApiError(t("auth.VERIFY_EMAIL_BEFORE_LOGIN", lang), 401);
    }

    if (
      !user.isActive ||
      user.account_status === accountStatus.BANNED ||
      user.account_status === accountStatus.SUSPENDED
    ) {
      throw new ApiError(t("auth.ACCOUNT_INACTIVE_SUSPENDED", lang), 403);
    }

    // Issues hashed tokens (also cleans expired + caps sessions)
    const { accessToken, refreshToken, accessTokenExpiresAt } =
      await issueSessionTokens(user);

    // Removing password from response
    user.passwordHash = undefined;

    return { user, accessToken, refreshToken, accessTokenExpiresAt };
  },

  forgetPassword: async ({ email }, lang) => {
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new ApiError(t("auth.USER_NOT_FOUND", lang), 404);
    }

    const resetCode = generateOtp();
    const hashedCode = hashOtp(resetCode);

    user.passwordResetCode = hashedCode;
    user.passwordResetCodeExpire = new Date(Date.now() + 20 * 60 * 1000);
    user.passwordResetCodeVerified = false;

    await user.save();

    sendEmailBackground({
      email: user.email,
      subject: "Password Reset Code",
      message: forgetPasswordEmailHTML(user.firstName, resetCode),
    });

    return { message: t("auth.RESET_CODE_SENT", lang) };
  },

  verifyResetCode: async ({ resetCode }, lang) => {
    const hashedCode = hashOtp(resetCode);
    const user = await UserModel.findOne({
      passwordResetCode: hashedCode,
      passwordResetCodeExpire: { $gt: Date.now() },
    });

    if (!user) {
      throw new ApiError(t("auth.INVALID_OR_EXPIRED_RESET_CODE", lang), 400);
    }

    user.passwordResetCodeVerified = true;
    await user.save();

    return { message: t("auth.RESET_CODE_VERIFIED", lang) };
  },

  resetPassword: async ({ email, newPassword }, lang) => {
    const user = await UserModel.findOne({ email }).select("+passwordHash");

    if (!user) {
      throw new ApiError(t("auth.USER_NOT_FOUND", lang), 404);
    }
    if (!user.passwordResetCodeVerified) {
      throw new ApiError(t("auth.RESET_CODE_NOT_VERIFIED", lang), 400);
    }

    user.passwordHash = newPassword;
    user.passwordResetCode = undefined;
    user.passwordResetCodeExpire = undefined;
    user.passwordResetCodeVerified = undefined;
    user.passwordChangedAT = new Date();

    // Invalidate all sessions on password change
    user.refreshTokens = [];

    await user.save();

    return { message: t("auth.PASSWORD_CHANGED", lang) };
  },

  refreshToken: async (currentRefreshToken, lang) => {
    if (!currentRefreshToken) {
      throw new ApiError(t("auth.NO_REFRESH_TOKEN", lang), 401);
    }

    // Verify the JWT signature + expiry
    let decoded;
    try {
      decoded = jwt.verify(currentRefreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      throw new ApiError(t("auth.INVALID_REFRESH_TOKEN", lang), 401);
    }

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      throw new ApiError(t("common.USER_NO_LONGER_EXISTS", lang), 401);
    }

    // Clean up expired tokens first
    const now = Date.now();
    user.refreshTokens = (user.refreshTokens || []).filter(
      (rt) => !rt.expiresAt || rt.expiresAt.getTime() > now,
    );

    // Hash the incoming token to compare against stored hashes
    const hashedIncoming = hashRefreshToken(currentRefreshToken);
    const storedToken = user.refreshTokens.find(
      (rt) => rt.token === hashedIncoming,
    );

    if (!storedToken) {
      // Token reuse detected — could be stolen. Invalidate ALL sessions.
      user.refreshTokens = [];
      await user.save();
      throw new ApiError(t("auth.REFRESH_TOKEN_REUSE", lang), 401);
    }

    // Remove the old token (consumed by rotation)
    user.refreshTokens = user.refreshTokens.filter(
      (rt) => rt.token !== hashedIncoming,
    );

    // Issue new pair (hashed in DB)
    const newAccessToken = createAccessToken(user._id, user.role);
    const newRefreshToken = createRefreshToken(user._id);
    const newHashedRefreshToken = hashRefreshToken(newRefreshToken);

    user.refreshTokens.push({
      token: newHashedRefreshToken,
      expiresAt: new Date(now + 30 * 24 * 60 * 60 * 1000),
    });

    await user.save();

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      accessTokenExpiresAt: getAccessTokenExpiresAt(),
    };
  },

  logout: async (currentRefreshToken, lang) => {
    if (!currentRefreshToken) {
      return { message: t("auth.LOGGED_OUT", lang) };
    }

    // Verify and find user
    let decoded;
    try {
      decoded = jwt.verify(currentRefreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      // Token expired/invalid — just clear cookie and return
      return { message: t("auth.LOGGED_OUT", lang) };
    }

    const user = await UserModel.findById(decoded.userId);
    if (user) {
      const hashedIncoming = hashRefreshToken(currentRefreshToken);

      // Remove the specific session + any expired tokens
      const now = Date.now();
      user.refreshTokens = (user.refreshTokens || []).filter(
        (rt) =>
          rt.token !== hashedIncoming &&
          (!rt.expiresAt || rt.expiresAt.getTime() > now),
      );

      await user.save();
    }

    return { message: t("auth.LOGGED_OUT", lang) };
  },
};
