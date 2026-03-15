import asyncHandler from "express-async-handler";
import {
  getPricingCalendarService,
  bulkSetPricingService,
} from "./roomPricing.service.js";

export const getPricingCalendar = asyncHandler(async (req, res) => {
  const data = await getPricingCalendarService(req.params.roomTypeId, req.query);

  res.status(200).json({ status: "success", data });
});

export const bulkSetPricing = asyncHandler(async (req, res) => {
  const data = await bulkSetPricingService(req.params.roomTypeId, req.body);

  res.status(200).json({ status: "success", data });
});
