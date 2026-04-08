import asyncHandler from "express-async-handler";
import {
  getConfigService,
  updateConfigService,
  getMyLoyaltyService,
  adjustPointsService,
  getUserLoyaltyService,
} from "./loyalty.service.js";
import { t } from "../../shared/i18n/index.js";

// GET /api/v1/loyalty/my
export const getMyLoyalty = asyncHandler(async (req, res) => {
  const data = await getMyLoyaltyService(req.user, req.query);
  res.status(200).json({ status: "success", data });
});

// GET /api/v1/loyalty/config  (admin)
export const getConfig = asyncHandler(async (req, res) => {
  const config = await getConfigService();
  res.status(200).json({ status: "success", data: config });
});

// PATCH /api/v1/loyalty/config  (admin)
export const updateConfig = asyncHandler(async (req, res) => {
  const config = await updateConfigService(req.body, req.lang);
  res.status(200).json({
    status: "success",
    message: t("loyalty.CONFIG_UPDATED", req.lang),
    data: config,
  });
});

// POST /api/v1/loyalty/adjust  (admin)
export const adjustPoints = asyncHandler(async (req, res) => {
  const data = await adjustPointsService(req.body, req.user, req.lang);
  res.status(200).json({
    status: "success",
    message: t("loyalty.POINTS_ADJUSTED", req.lang, {
      points: data.pointsAdjusted,
    }),
    data,
  });
});

// GET /api/v1/loyalty/users/:userId  (admin)
export const getUserLoyalty = asyncHandler(async (req, res) => {
  const data = await getUserLoyaltyService(
    req.params.userId,
    req.query,
    req.lang,
  );
  res.status(200).json({ status: "success", data });
});
