import { Router } from "express";
import { protect, allowedTo } from "../auth/auth.middleware.js";
import {
  getMyTier,
  getConfig,
  updateConfig,
  getUserTier,
} from "./tier.controller.js";
import {
  updateConfigValidator,
  getUserTierValidator,
} from "./tier.validator.js";

const router = Router();

// All tier routes require login
router.use(protect);

// ─── Client ────────────────────────────────────────────────
router.get("/me", getMyTier);

// ─── Admin ─────────────────────────────────────────────────
router.get("/config", getConfig);
router.patch(
  "/config",
  allowedTo("admin"),
  updateConfigValidator,
  updateConfig,
);
router.get(
  "/users/:userId",
  allowedTo("admin"),
  getUserTierValidator,
  getUserTier,
);

export default router;
