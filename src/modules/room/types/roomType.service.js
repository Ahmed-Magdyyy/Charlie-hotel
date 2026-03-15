import { RoomTypeModel } from "./roomType.model.js";
import {
  findRoomTypeById,
  findRoomTypes,
  countRoomTypes,
} from "./roomType.repository.js";
import { ApiError } from "../../../shared/utils/ApiError.js";
import {
  buildPagination,
  buildSort,
} from "../../../shared/utils/apiFeatures.js";
import { t } from "../../../shared/i18n/index.js";
import {
  validateImageFile,
  uploadImageToCloudinary,
  deleteImageFromCloudinary,
} from "../../../shared/utils/imageUpload.js";
import {
  bedTypes,
  roomViews,
  amenities as amenitiesEnum,
  reservationOptionTypes,
  cancellationPolicyTypes,
  paymentOptionTypes,
  cancellationDeadlines,
} from "../../../shared/constants/enums.js";

const CLOUDINARY_FOLDER = "charlie-hotel/room-types";

// ─── Label Resolution Helpers ───────────────────────────────

function resolveLabel(prefix, key, lang) {
  return t(`room.${prefix}_${key}`, lang);
}

/**
 * Transform a room type document: resolve enum keys → labels based on language.
 */
function resolveRoomTypeLabels(roomType, lang = "en") {
  const obj = roomType.toObject ? roomType.toObject() : { ...roomType };

  // Name & description — return only the requested language
  if (obj.name) {
    obj.name = obj.name[lang] || obj.name.en;
  }
  if (obj.description) {
    obj.description = obj.description[lang] || obj.description.en;
  }

  // Beds — add label
  if (obj.beds) {
    obj.beds = obj.beds.map((bed) => ({
      ...bed,
      label: resolveLabel("BED_TYPE", bed.type, lang),
    }));
  }

  // Amenities — transform from strings to objects with label
  if (obj.amenities) {
    obj.amenities = obj.amenities.map((key) => ({
      key,
      label: resolveLabel("AMENITY", key, lang),
    }));
  }

  // Views — transform from strings to objects with label
  if (obj.views) {
    obj.views = obj.views.map((key) => ({
      key,
      label: resolveLabel("VIEW", key, lang),
    }));
  }

  // Reservation options — add label
  if (obj.reservationOptions) {
    obj.reservationOptions = obj.reservationOptions.map((opt) => ({
      ...opt,
      label: resolveLabel("RESERVATION", opt.type, lang),
    }));
  }

  // Cancellation policies — add label + deadline from constants
  if (obj.cancellationPolicies) {
    obj.cancellationPolicies = obj.cancellationPolicies.map((pol) => ({
      ...pol,
      label: resolveLabel("CANCELLATION", pol.type, lang),
      deadline: cancellationDeadlines[pol.type] ?? null,
    }));
  }

  // Payment options — add label
  if (obj.paymentOptions) {
    obj.paymentOptions = obj.paymentOptions.map((opt) => ({
      ...opt,
      label: resolveLabel("PAYMENT", opt.type, lang),
    }));
  }

  return obj;
}

// ─── Parse / Upload Helpers ─────────────────────────────────

function parseJsonField(value, fieldName) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") return value; // already parsed
  try {
    return JSON.parse(value);
  } catch {
    throw new ApiError(`${fieldName} must be a valid JSON`, 400);
  }
}

async function uploadRoomImages(files) {
  if (!files || files.length === 0) return [];

  // Validate all files first (fail-fast before any upload)
  files.forEach((file) => validateImageFile(file));

  // Upload all images in parallel
  const results = await Promise.all(
    files.map((file, i) =>
      uploadImageToCloudinary(file, { folder: CLOUDINARY_FOLDER }).then(
        (result) => ({
          url: result.url,
          public_id: result.public_id,
          order: i,
        }),
      ),
    ),
  );

  return results;
}

async function cleanupCloudinaryImages(images) {
  if (!images || images.length === 0) return;
  await Promise.all(
    images.map((img) => deleteImageFromCloudinary(img.public_id)),
  );
}

// ─── Config ─────────────────────────────────────────────────

export function getRoomConfigService(lang) {
  const buildOptions = (prefix, values) =>
    Object.values(values).map((key) => ({
      key,
      label: resolveLabel(prefix, key, lang),
    }));

  return {
    bedTypes: buildOptions("BED_TYPE", bedTypes),
    amenities: buildOptions("AMENITY", amenitiesEnum),
    views: buildOptions("VIEW", roomViews),
    reservationOptions: buildOptions("RESERVATION", reservationOptionTypes),
    cancellationPolicies: Object.values(cancellationPolicyTypes).map((key) => ({
      key,
      label: resolveLabel("CANCELLATION", key, lang),
      deadline: cancellationDeadlines[key] ?? null,
    })),
    paymentOptions: buildOptions("PAYMENT", paymentOptionTypes),
  };
}

// ─── Create ─────────────────────────────────────────────────

export async function createRoomTypeService(payload, files, lang) {
  const {
    name_en,
    name_ar,
    description_en,
    description_ar,
    maxGuests,
    basePrice,
    beds,
    amenities,
    views,
    reservationOptions,
    cancellationPolicies,
    paymentOptions,
    totalRoomCount,
  } = payload;

  // Parse JSON string fields
  const parsedBeds = parseJsonField(beds, "beds");
  const parsedAmenities = parseJsonField(amenities, "amenities");
  const parsedViews = parseJsonField(views, "views");
  const parsedReservationOptions = parseJsonField(
    reservationOptions,
    "reservationOptions",
  );
  const parsedCancellationPolicies = parseJsonField(
    cancellationPolicies,
    "cancellationPolicies",
  );
  const parsedPaymentOptions = parseJsonField(paymentOptions, "paymentOptions");

  // Upload images to Cloudinary
  const images = await uploadRoomImages(files);

  const data = {
    name: { en: name_en, ...(name_ar && { ar: name_ar }) },
    ...(description_en && {
      description: {
        en: description_en,
        ...(description_ar && { ar: description_ar }),
      },
    }),
    maxGuests,
    basePrice,
    ...(parsedBeds && { beds: parsedBeds }),
    ...(parsedAmenities && { amenities: parsedAmenities }),
    ...(parsedViews && { views: parsedViews }),
    ...(images.length > 0 && { images }),
    ...(parsedReservationOptions && {
      reservationOptions: parsedReservationOptions,
    }),
    ...(parsedCancellationPolicies && {
      cancellationPolicies: parsedCancellationPolicies,
    }),
    ...(parsedPaymentOptions && { paymentOptions: parsedPaymentOptions }),
    ...(totalRoomCount !== undefined && { totalRoomCount }),
  };

  const roomType = await RoomTypeModel.create(data);
  return resolveRoomTypeLabels(roomType, lang);
}

// ─── List ───────────────────────────────────────────────────

export async function getRoomTypesService(queryParams, lang) {
  const { page, limit, includeInactive, raw, ...query } = queryParams;

  const filter = {};
  if (includeInactive !== "true") {
    filter.isActive = true;
  }

  if (query.name) {
    filter.$or = [
      { "name.en": { $regex: query.name, $options: "i" } },
      { "name.ar": { $regex: query.name, $options: "i" } },
    ];
  }

  const totalCount = await countRoomTypes(filter);
  const { pageNum, limitNum, skip } = buildPagination({ page, limit }, 10);
  const sort = buildSort(queryParams, "-createdAt");

  const roomTypes = await findRoomTypes(filter, {
    sort,
    skip,
    limit: limitNum,
  });

  const totalPages = Math.ceil(totalCount / limitNum) || 1;

  return {
    totalPages,
    page: pageNum,
    results: roomTypes.length,
    roomTypes: roomTypes.map((rt) =>
      raw === "true" ? (rt.toObject ? rt.toObject() : rt) : resolveRoomTypeLabels(rt, lang),
    ),
  };
}

// ─── Get By ID ──────────────────────────────────────────────

export async function getRoomTypeByIdService(id, lang, queryParams = {}) {
  const roomType = await findRoomTypeById(id);
  if (!roomType) {
    throw new ApiError(t("room.ROOM_NOT_FOUND", lang), 404);
  }
  if (queryParams.raw === "true") {
    return roomType.toObject ? roomType.toObject() : roomType;
  }
  return resolveRoomTypeLabels(roomType, lang);
}

// ─── Update ─────────────────────────────────────────────────

export async function updateRoomTypeService(id, payload, files, lang) {
  const roomType = await findRoomTypeById(id);
  if (!roomType) {
    throw new ApiError(t("room.ROOM_NOT_FOUND", lang), 404);
  }

  const {
    name_en,
    name_ar,
    description_en,
    description_ar,
    maxGuests,
    basePrice,
    beds,
    amenities,
    views,
    reservationOptions,
    cancellationPolicies,
    paymentOptions,
    totalRoomCount,
    isActive,
  } = payload;

  // Simple fields
  if (name_en !== undefined) roomType.name.en = name_en;
  if (name_ar !== undefined) roomType.name.ar = name_ar;
  if (description_en !== undefined) {
    if (!roomType.description) roomType.description = {};
    roomType.description.en = description_en;
  }
  if (description_ar !== undefined) {
    if (!roomType.description) roomType.description = {};
    roomType.description.ar = description_ar;
  }
  if (maxGuests !== undefined) roomType.maxGuests = maxGuests;
  if (basePrice !== undefined) roomType.basePrice = basePrice;
  if (totalRoomCount !== undefined) roomType.totalRoomCount = totalRoomCount;
  if (isActive !== undefined) roomType.isActive = isActive;

  // JSON string fields
  const parsedBeds = parseJsonField(beds, "beds");
  if (parsedBeds !== undefined) roomType.beds = parsedBeds;

  const parsedAmenities = parseJsonField(amenities, "amenities");
  if (parsedAmenities !== undefined) roomType.amenities = parsedAmenities;

  const parsedViews = parseJsonField(views, "views");
  if (parsedViews !== undefined) roomType.views = parsedViews;

  const parsedReservationOptions = parseJsonField(
    reservationOptions,
    "reservationOptions",
  );
  if (parsedReservationOptions !== undefined)
    roomType.reservationOptions = parsedReservationOptions;

  const parsedCancellationPolicies = parseJsonField(
    cancellationPolicies,
    "cancellationPolicies",
  );
  if (parsedCancellationPolicies !== undefined)
    roomType.cancellationPolicies = parsedCancellationPolicies;

  const parsedPaymentOptions = parseJsonField(paymentOptions, "paymentOptions");
  if (parsedPaymentOptions !== undefined)
    roomType.paymentOptions = parsedPaymentOptions;

  // Handle new image uploads
  if (files && files.length > 0) {
    await cleanupCloudinaryImages(roomType.images);
    const newImages = await uploadRoomImages(files);
    roomType.images = newImages;
  }

  await roomType.save();
  return resolveRoomTypeLabels(roomType, lang);
}

// ─── Delete (soft) ──────────────────────────────────────────

export async function deleteRoomTypeService(id, lang) {
  const roomType = await findRoomTypeById(id);
  if (!roomType) {
    throw new ApiError(t("room.ROOM_NOT_FOUND", lang), 404);
  }

  roomType.isActive = false;
  await roomType.save();
  return roomType;
}
