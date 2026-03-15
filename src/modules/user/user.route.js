import { Router } from "express";
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  toggleUserActive,
  getLoggedUser,
  updateLoggedUserPassword,
  updateLoggedUserData,
  deleteLoggedUser,
} from "./user.controller.js";

import {
  protect,
  allowedTo,
  requirePermission,
} from "../auth/auth.middleware.js";

import {
  createUserValidator,
  updateUserValidator,
  updateLoggedUserPasswordValidator,
  updateLoggedUserDataValidator,
  updateUserActiveValidator,
} from "./user.validator.js";

const router = Router();

// ----- Logged-in User Routes -----

router.get("/me", protect, getLoggedUser);

router.patch(
  "/me/password",
  protect,
  updateLoggedUserPasswordValidator,
  updateLoggedUserPassword,
);

router.patch(
  "/me",
  protect,
  updateLoggedUserDataValidator,
  updateLoggedUserData,
);

router.delete("/me", protect, deleteLoggedUser);

// ----- Admin / Staff Routes -----
// Require the user to be logged in for all below routes
router.use(protect);

router
  .route("/")
  .get(requirePermission("users", "read"), getUsers)
  .post(requirePermission("users", "create"), createUserValidator, createUser);

router
  .route("/:id")
  .get(requirePermission("users", "read"), getUser)
  .patch(requirePermission("users", "edit"), updateUserValidator, updateUser)
  .delete(requirePermission("users", "delete"), deleteUser);

router.patch(
  "/:id/toggle-active",
  requirePermission("users", "edit"),
  updateUserActiveValidator,
  toggleUserActive,
);

export default router;
