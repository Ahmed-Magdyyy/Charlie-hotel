export const roles = Object.freeze({
  ADMIN: "admin",
  STAFF: "staff",
  CLIENT: "client",
});

export const accountStatus = Object.freeze({
  PENDING: "pending",
  CONFIRMED: "confirmed",
  BANNED: "banned",
  DELETED: "deleted",
});

export const authProviderEnum = Object.freeze({
  SYSTEM: "SYSTEM",
  GOOGLE: "GOOGLE",
  APPLE: "APPLE",
});

export const orderStatusEnum = Object.freeze({
  PENDING: "pending",
  ACCEPTED: "accepted",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  RETURNED: "returned",
});

export const paymentMethodEnum = Object.freeze({
  COD: "cod",
  CARD: "card",
});

export const paymentStatusEnum = Object.freeze({
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
});

// ─── Permission System ─────────────────────────────────────

export const permissionActions = Object.freeze({
  READ: "read",
  CREATE: "create",
  EDIT: "edit",
  DELETE: "delete",
});

export const permissionResources = Object.freeze({
  USERS: "users",
  ROOMS: "rooms",
  RESERVATIONS: "reservations",
});

// ─── Room Types ─────────────────────────────────────────────

export const bedTypes = Object.freeze({
  KING: "king",
  QUEEN: "queen",
  SINGLE: "single",
  DOUBLE: "double",
  SOFA_BED: "sofa_bed",
  BUNK: "bunk",
});

export const roomViews = Object.freeze({
  POOL_VIEW: "pool_view",
  SEA_VIEW: "sea_view",
  CITY_VIEW: "city_view",
  GARDEN_VIEW: "garden_view",
  OPEN_VIEW: "open_view",
});

export const amenities = Object.freeze({
  WIFI: "wifi",
  AIR_CONDITIONING: "air_conditioning",
  MINIBAR: "minibar",
  BALCONY: "balcony",
  ROOM_SERVICE: "room_service",
  SAFE: "safe",
  TV: "tv",
  JACUZZI: "jacuzzi",
  BATHTUB: "bathtub",
  SHOWER: "shower",
  HAIR_DRYER: "hair_dryer",
  IRON: "iron",
  COFFEE_MAKER: "coffee_maker",
  KETTLE: "kettle",
  DESK: "desk",
  WARDROBE: "wardrobe",
  TELEPHONE: "telephone",
  SLIPPERS: "slippers",
  BATHROBES: "bathrobes",
});

export const reservationOptionTypes = Object.freeze({
  ROOM_ONLY: "room_only",
  BREAKFAST: "breakfast",
  HALF_BOARD: "half_board",
  FULL_BOARD: "full_board",
});

export const cancellationPolicyTypes = Object.freeze({
  FREE_CANCELLATION: "free_cancellation",
  NON_REFUNDABLE: "non_refundable",
});

export const paymentOptionTypes = Object.freeze({
  PAY_NOW: "pay_now",
  PAY_AT_HOTEL: "pay_at_hotel",
});

export const cancellationDeadlines = Object.freeze({
  free_cancellation: 3, // days before check-in
  non_refundable: 0,
});
