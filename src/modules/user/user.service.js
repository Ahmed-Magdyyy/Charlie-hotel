// src/modules/user/user.service.js
import bcrypt from "bcrypt";
import { UserModel } from "./user.model.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import { accountStatus, roles } from "../../shared/constants/enums.js";
import {
  buildPagination,
  buildSort,
  buildRegexFilter,
} from "../../shared/utils/apiFeatures.js";
import { t } from "../../shared/i18n/index.js";

const mapUserToResponse = (user) => {
  const response = {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    membershipNumber: user.membershipNumber,
    role: user.role,
    position: user.role === roles.STAFF ? user.position : undefined,
    permissions: user.role === roles.STAFF ? user.permissions : undefined,
    preferredLanguage: user.preferredLanguage,
    loyaltyPoints: user.loyaltyPoints,
    isActive: user.isActive,
    account_status: user.account_status,
    addresses: (user.addresses || []).map((a) => ({
      id: a._id,
      country: a.country,
      city: a.city,
      address: a.address,
    })),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return response;
};

// ----- Admin Services -----

export async function getUsersService(queryParams, requesterUser) {
  const { page, limit, ...query } = queryParams;

  const filter = {
    ...buildRegexFilter(query, ["role", "membershipNumber"]),
  };

  // Membership number is an exact match, not a regex
  if (query.membershipNumber) {
    filter.membershipNumber = query.membershipNumber;
  }

  // Only restrict from seeing admins if the requester is NOT an admin
  if (requesterUser?.role !== roles.ADMIN) {
    filter.role = { $ne: roles.ADMIN };
  }

  if (query.role) {
    if (query.role === roles.ADMIN && requesterUser?.role !== roles.ADMIN) {
      // Searching for admins is protected for non-admins, return empty
      filter.role = "non_existent_role";
    } else {
      filter.role = query.role;
    }
  }

  const totalUsersCount = await UserModel.countDocuments(filter);

  const { pageNum, limitNum, skip } = buildPagination({ page, limit }, 10);
  const sort = buildSort(queryParams, "-createdAt");

  const usersQuery = UserModel.find(filter).skip(skip).limit(limitNum);

  if (sort) {
    usersQuery.sort(sort);
  }

  const users = await usersQuery;
  const mappedUsers = users.map(mapUserToResponse);

  const totalPages = Math.ceil(totalUsersCount / limitNum) || 1;

  return {
    totalPages,
    page: pageNum,
    results: users.length,
    users: mappedUsers,
  };
}

export async function getUserByIdService(id, lang) {
  const user = await UserModel.findById(id);
  if (!user) {
    throw new ApiError(`${t("user.USER_NOT_FOUND", lang)}: ${id}`, 404);
  }
  return mapUserToResponse(user);
}

export async function createUserService(payload, lang) {
  const { email, phone, password, role, ...rest } = payload;

  // Check if user already exists
  const existingUser = await UserModel.findOne({
    $or: [{ email }, { phone }],
  });

  if (existingUser) {
    throw new ApiError(t("user.USER_ALREADY_EXISTS", lang), 400);
  }

  const user = await UserModel.create({
    email,
    phone,
    passwordHash: password,
    role: role || roles.GUEST,
    isActive: true, // Auto-active if created by Admin
    account_status: accountStatus.CONFIRMED,
    emailVerified: true, // Trust admin creation
    ...rest,
  });

  user.passwordHash = undefined;
  return mapUserToResponse(user);
}

export async function updateUserService(id, payload, lang) {
  const user = await UserModel.findById(id);
  if (!user) {
    throw new ApiError(`${t("user.USER_NOT_FOUND", lang)}: ${id}`, 404);
  }

  const {
    firstName,
    lastName,
    email,
    phone,
    role,
    position,
    permissions,
    preferredLanguage,
    loyaltyPoints,
    addresses,
  } = payload;

  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (email !== undefined) user.email = email;
  if (phone !== undefined) user.phone = phone;
  if (preferredLanguage !== undefined)
    user.preferredLanguage = preferredLanguage;
  if (loyaltyPoints !== undefined) user.loyaltyPoints = loyaltyPoints;

  if (role !== undefined) {
    user.role = role;
    if (role !== roles.STAFF) {
      user.position = undefined;
      user.permissions = new Map();
    }
  }

  if (role === roles.STAFF || user.role === roles.STAFF) {
    if (position !== undefined) user.position = position;
    if (permissions !== undefined) user.permissions = permissions;
  }

  if (addresses !== undefined) user.addresses = addresses;

  await user.save();
  return mapUserToResponse(user);
}

export async function deleteUserService(id, lang) {
  const user = await UserModel.findById(id);
  if (!user) {
    throw new ApiError(`${t("user.USER_NOT_FOUND", lang)}: ${id}`, 404);
  }

  if (user.role === roles.ADMIN) {
    throw new ApiError(t("user.ADMIN_CANNOT_BE_DELETED", lang), 403);
  }

  user.isActive = false;
  user.account_status = "suspended";
  user.refreshTokens = [];

  // We don't truly delete strings to preserve booking history, but we could pseudonymize them
  user.firstName = `Deleted`;
  user.lastName = `User`;

  await user.save();
  return user;
}

export async function toggleUserActiveService(id, lang) {
  const user = await UserModel.findById(id);
  if (!user) {
    throw new ApiError(`${t("user.USER_NOT_FOUND", lang)}: ${id}`, 404);
  }

  if (user.role === "admin") {
    throw new ApiError(t("user.ADMIN_CANNOT_TOGGLE_ACTIVE", lang), 403);
  }

  user.isActive = !user.isActive;

  if (!user.isActive) {
    user.refreshTokens = [];
  }

  await user.save();
  return user;
}

// ----- Logged-in User Services -----

export async function getLoggedUserService(currentUser) {
  return mapUserToResponse(currentUser);
}

export async function updateLoggedUserPasswordService({
  userId,
  currentPassword,
  newPassword,
  lang,
}) {
  const user = await UserModel.findById(userId).select("+passwordHash");
  if (!user) {
    throw new ApiError(t("auth.USER_NOT_FOUND", lang), 404);
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(t("user.CURRENT_PASSWORD_INCORRECT", lang), 401);
  }

  user.passwordHash = newPassword;
  user.passwordChangedAT = new Date();
  // Invalidate all sessions on password change
  user.refreshTokens = [];

  await user.save();
  user.passwordHash = undefined;

  return user;
}

export async function updateLoggedUserDataService({
  userId,
  firstName,
  lastName,
  email,
  phone,
  preferredLanguage,
  addresses,
  lang,
}) {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new ApiError(t("auth.USER_NOT_FOUND", lang), 404);
  }

  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (preferredLanguage !== undefined)
    user.preferredLanguage = preferredLanguage;

  // If email or phone changes, we should ideally require re-verification.
  // For simplicity based on old user module, we just update it.
  if (email !== undefined) {
    user.email = email;
    user.emailVerified = false; // Require them to verify again.
  }
  if (phone !== undefined) {
    user.phone = phone;
  }
  if (addresses !== undefined) user.addresses = addresses;

  await user.save();
  return mapUserToResponse(user);
}

export async function deleteLoggedUserService({ userId, lang }) {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new ApiError(t("auth.USER_NOT_FOUND", lang), 404);
  }

  user.isActive = false;
  user.account_status = accountStatus.DELETED;
  user.refreshTokens = [];

  await user.save();
  return mapUserToResponse(user);
}
