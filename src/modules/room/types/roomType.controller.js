import asyncHandler from "express-async-handler";
import {
  createRoomTypeService,
  getRoomTypesService,
  getRoomTypeByIdService,
  updateRoomTypeService,
  deleteRoomTypeService,
  getRoomConfigService,
} from "./roomType.service.js";
import { t } from "../../../shared/i18n/index.js";

// GET /api/v1/rooms/types/config
export const getRoomConfig = asyncHandler(async (req, res) => {
  const config = getRoomConfigService(req.lang);
  res.status(200).json({ data: config });
});

// GET /api/v1/rooms/types
export const getRoomTypes = asyncHandler(async (req, res) => {
  const result = await getRoomTypesService(req.query, req.lang);
  res.status(200).json(result);
});

// GET /api/v1/rooms/types/:id
export const getRoomType = asyncHandler(async (req, res) => {
  const roomType = await getRoomTypeByIdService(req.params.id, req.lang, req.query);
  res.status(200).json({ data: roomType });
});

// POST /api/v1/rooms/types
export const createRoomType = asyncHandler(async (req, res) => {
  const roomType = await createRoomTypeService(req.body, req.files, req.lang);
  res.status(201).json({
    status: "success",
    message: t("room.ROOM_CREATED", req.lang),
    data: roomType,
  });
});

// PATCH /api/v1/rooms/types/:id
export const updateRoomType = asyncHandler(async (req, res) => {
  const roomType = await updateRoomTypeService(
    req.params.id,
    req.body,
    req.files,
    req.lang,
  );
  res.status(200).json({ data: roomType });
});

// DELETE /api/v1/rooms/types/:id
export const deleteRoomType = asyncHandler(async (req, res) => {
  await deleteRoomTypeService(req.params.id, req.lang);
  res.status(200).json({ message: t("room.ROOM_DELETED", req.lang) });
});
