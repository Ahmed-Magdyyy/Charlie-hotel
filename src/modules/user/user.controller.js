// src/modules/user/user.controller.js
import asyncHandler from "express-async-handler";
import {
  getUsersService,
  getUserByIdService,
  createUserService,
  updateUserService,
  deleteUserService,
  toggleUserActiveService,
  getLoggedUserService,
  updateLoggedUserPasswordService,
  updateLoggedUserDataService,
  deleteLoggedUserService,
} from "./user.service.js";
import { t } from "../../shared/i18n/index.js";

// ----- Admin Controllers -----

// GET /api/v1/users
export const getUsers = asyncHandler(async (req, res) => {
  const result = await getUsersService(req.query, req.user);
  res.status(200).json(result);
});

// GET /api/v1/users/:id
export const getUser = asyncHandler(async (req, res) => {
  const user = await getUserByIdService(req.params.id, req.lang);
  res.status(200).json({ user });
});

// POST /api/v1/users
export const createUser = asyncHandler(async (req, res) => {
  const doc = await createUserService(req.body, req.lang);
  res.status(201).json({ message: t("common.SUCCESS", req.lang), data: doc });
});

// PATCH /api/v1/users/:id
export const updateUser = asyncHandler(async (req, res) => {
  const updatedUser = await updateUserService(
    req.params.id,
    req.body,
    req.lang,
  );
  res.status(200).json({ data: updatedUser });
});

// DELETE /api/v1/users/:id
export const deleteUser = asyncHandler(async (req, res) => {
  await deleteUserService(req.params.id, req.lang);
  res.status(200).json({ message: t("user.USER_DELETED", req.lang) });
});

// PATCH /api/v1/users/:id/toggle-active
export const toggleUserActive = asyncHandler(async (req, res) => {
  const updatedUser = await toggleUserActiveService(req.params.id, req.lang);
  res.status(200).json({
    message: t("user.USER_ACTIVE_TOGGLED", req.lang),
    data: updatedUser,
  });
});

// ----- Logged-in User Controllers -----

// GET /api/v1/users/me
export const getLoggedUser = asyncHandler(async (req, res) => {
  const user = await getLoggedUserService(req.user);
  res.status(200).json({ data: user });
});

// PATCH /api/v1/users/me/password
export const updateLoggedUserPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const updatedUser = await updateLoggedUserPasswordService({
    userId: req.user._id,
    currentPassword,
    newPassword,
    lang: req.lang,
  });

  res
    .status(200)
    .json({ message: t("user.PASSWORD_CHANGED", req.lang), data: updatedUser });
});

// PATCH /api/v1/users/me
export const updateLoggedUserData = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone, preferredLanguage } = req.body;

  const updatedUser = await updateLoggedUserDataService({
    userId: req.user._id,
    firstName,
    lastName,
    email,
    phone,
    preferredLanguage,
    lang: req.lang,
  });

  res.status(200).json({ data: updatedUser });
});

// DELETE /api/v1/users/me
export const deleteLoggedUser = asyncHandler(async (req, res) => {
  const deletedUser = await deleteLoggedUserService({
    userId: req.user._id,
    lang: req.lang,
  });
  res.status(200).json({
    message: t("user.ACCOUNT_DELETED", req.lang),
    userDeleted: deletedUser,
  });
});
