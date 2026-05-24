export const roles = Object.freeze({
  ADMIN: "admin",
  STAFF: "staff",
  GUEST: "guest",
});

export const accountStatus = Object.freeze({
  PENDING: "pending",
  CONFIRMED: "confirmed",
  BANNED: "banned",
  DELETED: "deleted",
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
  NOTIFICATIONS: "notifications",
});

// ─── Bed Types ─────────────────────────────────────────────

export const bedTypes = Object.freeze({
  KING: "king",
  QUEEN: "queen",
  SINGLE: "single",
  DOUBLE: "double",
  TWIN: "twin",
  SOFA_BED: "sofa_bed",
  BUNK: "bunk",
});

// ─── Room Views ────────────────────────────────────────────

export const roomViews = Object.freeze({
  SEA_VIEW: "sea_view",
  POOL_VIEW: "pool_view",
  CITY_VIEW: "city_view",
  GARDEN_VIEW: "garden_view",
  MOUNTAIN_VIEW: "mountain_view",
  LANDMARK_VIEW: "landmark_view",
  COURTYARD_VIEW: "courtyard_view",
  STREET_VIEW: "street_view",
  OPEN_VIEW: "open_view",
});

// ─── Room Amenities (categorized) ──────────────────────────

export const amenityCategories = Object.freeze({
  BATHROOM: "bathroom",
  BEDROOM: "bedroom",
  MEDIA: "media",
  KITCHEN: "kitchen",
  SAFETY: "safety",
  GENERAL: "general",
});

export const amenities = Object.freeze({
  // Bathroom
  PRIVATE_BATHROOM: "private_bathroom",
  BATHTUB: "bathtub",
  SHOWER: "shower",
  WALK_IN_SHOWER: "walk_in_shower",
  JACUZZI: "jacuzzi",
  BIDET: "bidet",
  HAIR_DRYER: "hair_dryer",
  BATHROBES: "bathrobes",
  SLIPPERS: "slippers",
  FREE_TOILETRIES: "free_toiletries",
  TOWELS: "towels",

  // Bedroom & Living
  AIR_CONDITIONING: "air_conditioning",
  WARDROBE: "wardrobe",
  DESK: "desk",
  SITTING_AREA: "sitting_area",
  SOFA: "sofa",
  IRON: "iron",
  SOUNDPROOFING: "soundproofing",
  CARPETED_FLOOR: "carpeted_floor",
  TILED_FLOOR: "tiled_floor",
  BLACKOUT_CURTAINS: "blackout_curtains",
  CONNECTING_ROOMS: "connecting_rooms",

  // Media & Technology
  TV: "tv",
  FLAT_SCREEN_TV: "flat_screen_tv",
  SATELLITE_CHANNELS: "satellite_channels",
  WIFI: "wifi",
  TELEPHONE: "telephone",
  STREAMING_SERVICE: "streaming_service",
  SOCKET_NEAR_BED: "socket_near_bed",

  // Kitchen & Dining
  MINIBAR: "minibar",
  COFFEE_MAKER: "coffee_maker",
  KETTLE: "kettle",
  REFRIGERATOR: "refrigerator",
  KITCHENETTE: "kitchenette",
  MICROWAVE: "microwave",
  DINING_AREA: "dining_area",

  // Safety
  SAFE: "safe",
  SMOKE_ALARM: "smoke_alarm",
  FIRE_EXTINGUISHER: "fire_extinguisher",
  KEY_CARD_ACCESS: "key_card_access",

  // General
  BALCONY: "balcony",
  TERRACE: "terrace",
  ROOM_SERVICE: "room_service",
  WAKE_UP_SERVICE: "wake_up_service",
  PRIVATE_ENTRANCE: "private_entrance",
});

// Map each amenity to its category (for /config grouping)
export const amenityCategoryMap = Object.freeze({
  // Bathroom
  private_bathroom: "bathroom",
  bathtub: "bathroom",
  shower: "bathroom",
  walk_in_shower: "bathroom",
  jacuzzi: "bathroom",
  bidet: "bathroom",
  hair_dryer: "bathroom",
  bathrobes: "bathroom",
  slippers: "bathroom",
  free_toiletries: "bathroom",
  towels: "bathroom",

  // Bedroom & Living
  air_conditioning: "bedroom",
  wardrobe: "bedroom",
  desk: "bedroom",
  sitting_area: "bedroom",
  sofa: "bedroom",
  iron: "bedroom",
  soundproofing: "bedroom",
  carpeted_floor: "bedroom",
  tiled_floor: "bedroom",
  blackout_curtains: "bedroom",
  connecting_rooms: "bedroom",

  // Media & Technology
  tv: "media",
  flat_screen_tv: "media",
  satellite_channels: "media",
  wifi: "media",
  telephone: "media",
  streaming_service: "media",
  socket_near_bed: "media",

  // Kitchen & Dining
  minibar: "kitchen",
  coffee_maker: "kitchen",
  kettle: "kitchen",
  refrigerator: "kitchen",
  kitchenette: "kitchen",
  microwave: "kitchen",
  dining_area: "kitchen",

  // Safety
  safe: "safety",
  smoke_alarm: "safety",
  fire_extinguisher: "safety",
  key_card_access: "safety",

  // General
  balcony: "general",
  terrace: "general",
  room_service: "general",
  wake_up_service: "general",
  private_entrance: "general",
});

// ─── Smoking Policy ────────────────────────────────────────

export const smokingPolicies = Object.freeze({
  NON_SMOKING: "non_smoking",
  SMOKING: "smoking",
});

// ─── Accessibility Features ────────────────────────────────

export const accessibilityFeatures = Object.freeze({
  WHEELCHAIR_ACCESSIBLE: "wheelchair_accessible",
  ROLL_IN_SHOWER: "roll_in_shower",
  TOILET_WITH_GRAB_RAILS: "toilet_with_grab_rails",
  ELEVATED_TOILET: "elevated_toilet",
  LOW_BATHROOM_SINK: "low_bathroom_sink",
  EMERGENCY_PULL_CORD: "emergency_pull_cord",
});

// ─── Reservation Options ───────────────────────────────────

export const reservationOptionTypes = Object.freeze({
  ROOM_ONLY: "room_only",
  BREAKFAST: "breakfast",
  HALF_BOARD: "half_board",
  FULL_BOARD: "full_board",
});

// ─── Cancellation Policies ─────────────────────────────────

export const cancellationPolicyTypes = Object.freeze({
  FREE_CANCELLATION: "free_cancellation",
  NON_REFUNDABLE: "non_refundable",
});

export const cancellationDeadlines = Object.freeze({
  free_cancellation: 3, // days before check-in
  non_refundable: 0,
});

// ─── Payment Options ───────────────────────────────────────

export const paymentOptionTypes = Object.freeze({
  PAY_NOW: "pay_now",
  PAY_AT_HOTEL: "pay_at_hotel",
});

// ─── Booking ───────────────────────────────────────────────

export const bookingStatus = Object.freeze({
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CHECKED_IN: "checked_in",
  CHECKED_OUT: "checked_out",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
  NO_SHOW: "no_show",
});

export const bookingPaymentStatus = Object.freeze({
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
});

// Valid status transitions: from → [allowed targets]
export const bookingStatusTransitions = Object.freeze({
  pending: ["confirmed", "cancelled", "expired"],
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: ["checked_out"],
  // Terminal states — no transitions out
  checked_out: [],
  cancelled: [],
  expired: [],
  no_show: [],
});

// ─── Supported Currencies ──────────────────────────────────

export const supportedCurrencies = Object.freeze([
  "SAR",
  "EUR",
  "USD",
  "AED",
  "EGP",
  "GBP",
]);

// ─── Saudi Tax Rates ───────────────────────────────────────

export const MUN_TAX_RATE = 0.025; // 2.5% Municipal tax
export const VAT_RATE = 0.15; // 15% VAT (applied after mun tax)

// ─── Notification Icons ────────────────────────────────────

export const notificationIcons = Object.freeze({
  BOOKING: "booking",
  PAYMENT: "payment",
  LOYALTY: "loyalty",
  SYSTEM: "system",
  PROMO: "promo",
});
