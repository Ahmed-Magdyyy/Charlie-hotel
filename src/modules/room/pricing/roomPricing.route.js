import { Router } from "express";
import {
  getPricingCalendar,
  bulkSetPricing,
} from "./roomPricing.controller.js";
import { protect, requirePermission } from "../../auth/auth.middleware.js";
import {
  getPricingValidator,
  bulkSetPricingValidator,
} from "./roomPricing.validator.js";

const router = Router();

router.use(protect);

router.get(
  "/:roomTypeId",
  requirePermission("rooms", "edit"),
  getPricingValidator,
  getPricingCalendar,
);

router.patch(
  "/:roomTypeId",
  requirePermission("rooms", "edit"),
  bulkSetPricingValidator,
  bulkSetPricing,
);

export default router;
