import { Router } from "express";
import {
  getAvailabilityCalendar,
  bulkSetAvailability,
  searchAvailableRooms,
} from "./roomAvailability.controller.js";
import { protect, requirePermission } from "../../auth/auth.middleware.js";
import {
  getAvailabilityValidator,
  bulkSetAvailabilityValidator,
  searchAvailabilityValidator,
} from "./roomAvailability.validator.js";

const router = Router();

// Public — used by booking flow
router.get("/search", searchAvailabilityValidator, searchAvailableRooms);

// Protected — admin/staff
router.use(protect);

router.get(
  "/:roomTypeId",
  requirePermission("rooms", "edit"),
  getAvailabilityValidator,
  getAvailabilityCalendar,
);

router.patch(
  "/:roomTypeId",
  requirePermission("rooms", "edit"),
  bulkSetAvailabilityValidator,
  bulkSetAvailability,
);

export default router;
