// Centralized DB queries for RoomType — used by room, pricing, availability, and booking modules.

import { RoomTypeModel } from "./roomType.model.js";

/**
 * Find a room type by ID.
 * @param {string} id
 * @param {object} [options] - { lean, select }
 */
export async function findRoomTypeById(id, options = {}) {
  const query = RoomTypeModel.findById(id);
  if (options.select) query.select(options.select);
  if (options.lean) query.lean();
  return query;
}

/**
 * Find active room types with optional filters.
 * @param {object} filter - Mongo filter
 * @param {object} [options] - { lean, select, sort, skip, limit }
 */
export async function findRoomTypes(filter = {}, options = {}) {
  const query = RoomTypeModel.find(filter);
  if (options.select) query.select(options.select);
  if (options.sort) query.sort(options.sort);
  if (options.skip) query.skip(options.skip);
  if (options.limit) query.limit(options.limit);
  if (options.lean) query.lean();
  return query;
}

/**
 * Count room types matching a filter.
 * @param {object} filter
 */
export async function countRoomTypes(filter = {}) {
  return RoomTypeModel.countDocuments(filter);
}

/**
 * Find all active room types (convenience for other modules like pricing/booking).
 * @param {object} [options] - { select, lean }
 */
export async function findActiveRoomTypes(options = {}) {
  return findRoomTypes({ isActive: true }, options);
}

/**
 * Check if a room type exists and is active.
 * @param {string} id
 */
export async function roomTypeExistsAndActive(id) {
  const doc = await RoomTypeModel.findOne({ _id: id, isActive: true })
    .select("_id")
    .lean();
  return !!doc;
}
