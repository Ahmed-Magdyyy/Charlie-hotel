import asyncHandler from "express-async-handler";
import {
  getAvailabilityCalendarService,
  blockRoomsService,
  searchAvailableRoomsService,
} from "./roomAvailability.service.js";

// GET /api/v1/rooms/availability/:roomTypeId
export const getAvailabilityCalendar = asyncHandler(async (req, res) => {
  const data = await getAvailabilityCalendarService(
    req.params.roomTypeId,
    req.query,
    req.lang,
  );
  res.status(200).json({ status: "success", data });
});

// PATCH /api/v1/rooms/availability/:roomTypeId
export const blockRooms = asyncHandler(async (req, res) => {
  const data = await blockRoomsService(
    req.params.roomTypeId,
    req.body,
    req.lang,
  );
  res.status(200).json({ status: "success", data });
});

// GET /api/v1/rooms/availability/search
export const searchAvailableRooms = asyncHandler(async (req, res) => {
  const data = await searchAvailableRoomsService(req.query, req.lang);
  res.status(200).json({ status: "success", results: data.length, data });
});
