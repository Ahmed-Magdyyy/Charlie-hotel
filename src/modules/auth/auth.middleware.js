import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import { ApiError } from "../../shared/utils/ApiError.js";
import { UserModel } from "../user/user.model.js";
import { t } from "../../shared/i18n/index.js";

export const protect = asyncHandler(async (req, res, next) => {
  const lang = req.lang || "en";
  let accessToken;

  if (req.headers.authorization?.startsWith("Bearer")) {
    accessToken = req.headers.authorization.split(" ")[1];
  }

  if (!accessToken) {
    throw new ApiError(t("common.LOGIN_REQUIRED", lang), 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
  } catch {
    throw new ApiError(t("common.INVALID_OR_EXPIRED_TOKEN", lang), 401);
  }

  const currentUser = await UserModel.findById(decoded.userId);

  if (!currentUser) {
    throw new ApiError(t("common.USER_NO_LONGER_EXISTS", lang), 401);
  }

  if (
    currentUser.account_status === "panned" ||
    currentUser.account_status === "suspended"
  ) {
    throw new ApiError(t("common.ACCOUNT_BANNED_SUSPENDED", lang), 403);
  }

  if (
    currentUser.passwordChangedAT &&
    currentUser.passwordChangedAT.getTime() > decoded.iat * 1000
  ) {
    throw new ApiError(t("common.PASSWORD_CHANGED_LOGIN_AGAIN", lang), 401);
  }

  if (!currentUser.isActive) {
    throw new ApiError(t("common.ACCOUNT_NOT_ACTIVE", lang), 401);
  }

  req.user = currentUser;
  next();
});

export const allowedTo = (...allowedRoles) =>
  asyncHandler(async (req, res, next) => {
    const lang = req.lang || "en";
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      throw new ApiError(t("common.NOT_ALLOWED", lang), 403);
    }
    next();
  });

export const requirePermission = (resource, action) =>
  asyncHandler(async (req, res, next) => {
    const lang = req.lang || "en";
    const user = req.user;

    if (!user) {
      throw new ApiError(t("common.LOGIN_REQUIRED", lang), 401);
    }

    // Admins & superAdmins bypass all permission checks
    if (user.role === "admin" || user.role === "superAdmin") {
      return next();
    }

    if (user.role !== "staff") {
      throw new ApiError(t("common.NO_PERMISSION", lang), 403);
    }

    // Check the structured permission: permissions.get('rooms')?.read
    const modulePerms = user.permissions?.get(resource);

    if (!modulePerms || !modulePerms[action]) {
      throw new ApiError(
        `${t("common.PERMISSION_MISSING", lang)}: ${action}:${resource}`,
        403,
      );
    }

    next();
  });
