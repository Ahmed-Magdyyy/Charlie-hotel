import { Router } from "express";
import { protect, requirePermission } from "../auth/auth.middleware.js";
import { uploadMultipleImages } from "../../shared/middlewares/uploadMiddleware.js";

// ─── Room Type Controllers & Validators ─────────────────────
import {
  getRoomConfig,
  getRoomTypes,
  getRoomType,
  createRoomType,
  updateRoomType,
  deleteRoomType,
} from "./types/roomType.controller.js";
import {
  createRoomTypeValidator,
  updateRoomTypeValidator,
  getRoomTypeValidator,
} from "./types/roomType.validator.js";

// ─── Pricing Controllers & Validators ───────────────────────
import {
  getPricingCalendar,
  bulkSetPricing,
} from "./pricing/roomPricing.controller.js";
import {
  getPricingValidator,
  bulkSetPricingValidator,
} from "./pricing/roomPricing.validator.js";

// ─── Availability Controllers & Validators ──────────────────
import {
  getAvailabilityCalendar,
  blockRooms,
  searchAvailableRooms,
} from "./availability/roomAvailability.controller.js";
import {
  getAvailabilityValidator,
  blockRoomsValidator,
  searchAvailabilityValidator,
} from "./availability/roomAvailability.validator.js";

const router = Router();

// ─── Public Routes ──────────────────────────────────────────
router.get("/search", searchAvailabilityValidator, searchAvailableRooms);
router.get(
  "/config",
  protect,
  requirePermission("rooms", "create", "edit"),
  getRoomConfig,
);
router.get("/", getRoomTypes);
router.get("/:roomTypeId", getRoomTypeValidator, getRoomType);

// ─── Protected Routes ───────────────────────────────────────
router.use(protect);

// Room type CRUD
router.post(
  "/",
  requirePermission("rooms", "create"),
  uploadMultipleImages("images", 10),
  createRoomTypeValidator,
  createRoomType,
);

router.patch(
  "/:roomTypeId",
  requirePermission("rooms", "edit"),
  uploadMultipleImages("images", 10),
  updateRoomTypeValidator,
  updateRoomType,
);

router.delete(
  "/:roomTypeId",
  requirePermission("rooms", "delete"),
  getRoomTypeValidator,
  deleteRoomType,
);

// Pricing
router.get(
  "/:roomTypeId/pricing",
  requirePermission("rooms", "edit"),
  getPricingValidator,
  getPricingCalendar,
);

router.patch(
  "/:roomTypeId/pricing",
  requirePermission("rooms", "edit"),
  bulkSetPricingValidator,
  bulkSetPricing,
);

// Availability
router.get(
  "/:roomTypeId/availability",
  requirePermission("rooms", "edit"),
  getAvailabilityValidator,
  getAvailabilityCalendar,
);

router.patch(
  "/:roomTypeId/availability",
  requirePermission("rooms", "edit"),
  blockRoomsValidator,
  blockRooms,
);

export default router;
