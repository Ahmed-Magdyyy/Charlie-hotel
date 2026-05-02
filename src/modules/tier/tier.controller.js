import asyncHandler from "express-async-handler";
import {
  getConfigService,
  updateConfigService,
  getUserTierService,
} from "./tier.service.js";
import { t } from "../../shared/i18n/index.js";

// GET /api/v1/tiers/my
export const getMyTier = asyncHandler(async (req, res) => {
  const data = await getUserTierService(req.user._id, req.lang);
  res.status(200).json({ status: "success", data });
});

// GET /api/v1/tiers/config  (admin)
export const getConfig = asyncHandler(async (req, res) => {
  const config = await getConfigService();
  res.status(200).json({ status: "success", data: config });
});

// PATCH /api/v1/tiers/config  (admin)
export const updateConfig = asyncHandler(async (req, res) => {
  const config = await updateConfigService(req.body, req.lang);
  res.status(200).json({
    status: "success",
    message: t("tier.CONFIG_UPDATED", req.lang),
    data: config,
  });
});

// GET /api/v1/tiers/users/:userId  (admin)
export const getUserTier = asyncHandler(async (req, res) => {
  const data = await getUserTierService(req.params.userId, req.lang);
  res.status(200).json({ status: "success", data });
});
