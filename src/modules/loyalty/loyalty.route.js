import { Router } from "express";
import { protect, allowedTo } from "../auth/auth.middleware.js";
import {
  getMyLoyalty,
  getConfig,
  updateConfig,
  adjustPoints,
  getUserLoyalty,
} from "./loyalty.controller.js";
import {
  updateConfigValidator,
  adjustPointsValidator,
  getUserLoyaltyValidator,
} from "./loyalty.validator.js";

const router = Router();

// All loyalty routes require login
router.use(protect);

// ─── Client ────────────────────────────────────────────────
router.get("/my", getMyLoyalty);

// ─── Admin ─────────────────────────────────────────────────
router.get("/config", allowedTo("admin"), getConfig);
router.patch("/config", allowedTo("admin"), updateConfigValidator, updateConfig);
router.post("/adjust", allowedTo("admin"), adjustPointsValidator, adjustPoints);
router.get("/users/:userId", allowedTo("admin"), getUserLoyaltyValidator, getUserLoyalty);

export default router;
