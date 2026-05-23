import asyncHandler from "express-async-handler";
import { getDashboardService } from "./analytics.service.js";

// GET /api/v1/analytics/dashboard
export const getDashboard = asyncHandler(async (req, res) => {
  const data = await getDashboardService(req.query);
  res.status(200).json({ status: "success", ...data });
});
