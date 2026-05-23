import { Router } from "express";
import { protect, requirePermission } from "../auth/auth.middleware.js";
import { getDashboard } from "./analytics.controller.js";
import { getDashboardValidator } from "./analytics.validator.js";

const router = Router();

// All analytics routes require login + reservations.read permission
router.use(protect);

router.get(
  "/dashboard",
  requirePermission("reservations", "read"),
  getDashboardValidator,
  getDashboard,
);

export default router;
