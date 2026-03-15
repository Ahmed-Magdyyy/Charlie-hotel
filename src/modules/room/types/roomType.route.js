import { Router } from "express";
import {
  getRoomConfig,
  getRoomTypes,
  getRoomType,
  createRoomType,
  updateRoomType,
  deleteRoomType,
} from "./roomType.controller.js";
import {
  protect,
  requirePermission,
} from "../../auth/auth.middleware.js";
import {
  createRoomTypeValidator,
  updateRoomTypeValidator,
  getRoomTypeValidator,
} from "./roomType.validator.js";
import { uploadMultipleImages } from "../../../shared/middlewares/uploadMiddleware.js";

const router = Router();

// ─── Public Routes ──────────────────────────────────────────

router.get("/config", getRoomConfig);
router.get("/", getRoomTypes);
router.get("/:id", getRoomTypeValidator, getRoomType);

// ─── Protected Routes (Admin / Staff with rooms permission) ─

router.use(protect);

router.post(
  "/",
  requirePermission("rooms", "create"),
  uploadMultipleImages("images", 10),
  createRoomTypeValidator,
  createRoomType,
);

router.patch(
  "/:id",
  requirePermission("rooms", "edit"),
  uploadMultipleImages("images", 10),
  updateRoomTypeValidator,
  updateRoomType,
);

router.delete(
  "/:id",
  requirePermission("rooms", "delete"),
  getRoomTypeValidator,
  deleteRoomType,
);

export default router;
