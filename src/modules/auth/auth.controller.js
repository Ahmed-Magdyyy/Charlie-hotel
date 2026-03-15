import asyncHandler from "express-async-handler";
import { authService } from "./auth.service.js";
import { roles } from "../../shared/constants/enums.js";

function buildAuthUserResponse(user) {
  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    accountStatus: user.account_status,
    role: user.role,
    position: user.role === roles.STAFF ? user.position : undefined,
    permissions: user.role === roles.STAFF ? user.permissions : undefined,
    loyaltyPoints: user.loyaltyPoints,
  };
}

// Cookie options helper
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
});

export const signup = asyncHandler(async (req, res) => {
  const result = await authService.signup(req.body, req.lang);
  res.status(201).json({ status: "success", data: result });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken, user, accessTokenExpiresAt } =
    await authService.verifyEmail(req.body, req.lang);

  res.cookie("refreshToken", refreshToken, getCookieOptions());

  res.status(200).json({
    status: "success",
    data: buildAuthUserResponse(user),
    accessToken,
    accessTokenExpiresAt,
  });
});

export const resendOtp = asyncHandler(async (req, res) => {
  const result = await authService.resendOtp(req.body, req.lang);
  res.status(200).json({ status: "success", data: result });
});

export const login = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken, user, accessTokenExpiresAt } =
    await authService.login(req.body, req.lang);

  res.cookie("refreshToken", refreshToken, getCookieOptions());

  res.status(200).json({
    status: "success",
    data: buildAuthUserResponse(user),
    accessToken,
    accessTokenExpiresAt,
  });
});

export const forgetPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgetPassword(req.body, req.lang);
  res.status(200).json({ status: "success", data: result });
});

export const verifyResetCode = asyncHandler(async (req, res) => {
  const result = await authService.verifyResetCode(req.body, req.lang);
  res.status(200).json({ status: "success", data: result });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body, req.lang);
  res.status(200).json({ status: "success", data: result });
});

export const refreshToken = asyncHandler(async (req, res) => {
  const currentRefreshToken = req.cookies.refreshToken;
  const {
    accessToken,
    refreshToken: newRefreshToken,
    accessTokenExpiresAt,
  } = await authService.refreshToken(currentRefreshToken, req.lang);

  res.cookie("refreshToken", newRefreshToken, getCookieOptions());

  res.status(200).json({
    status: "success",
    accessToken,
    accessTokenExpiresAt,
  });
});

export const logout = asyncHandler(async (req, res) => {
  const currentRefreshToken = req.cookies.refreshToken;
  const result = await authService.logout(currentRefreshToken, req.lang);

  res.clearCookie("refreshToken", getCookieOptions());

  res.status(200).json({ status: "success", data: result });
});
