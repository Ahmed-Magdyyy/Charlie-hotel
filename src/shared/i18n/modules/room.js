// src/shared/i18n/modules/room.js
// Room module specific messages + enum label maps

export default {
  // ─── Error / Success Messages ─────────────────────────────
  ROOM_NOT_FOUND: {
    en: "Room not found",
    ar: "لم يتم العثور على الغرفة",
  },
  ROOM_DELETED: {
    en: "Room deactivated successfully",
    ar: "تم إلغاء تفعيل الغرفة بنجاح",
  },
  ROOM_ALREADY_EXISTS: {
    en: "Room already exists",
    ar: "الغرفة موجودة بالفعل",
  },
  ROOM_UPDATED: {
    en: "Room updated successfully",
    ar: "تم تحديث الغرفة بنجاح",
  },
  ROOM_CREATED: {
    en: "Room created successfully",
    ar: "تم إنشاء الغرفة بنجاح",
  },
  AVAILABILITY_END_BEFORE_START: {
    en: "End date must be on or after start date",
    ar: "تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية",
  },
  AVAILABILITY_RANGE_TOO_LARGE: {
    en: "Date range cannot exceed 365 days",
    ar: "نطاق التاريخ لا يمكن أن يتجاوز 365 يوم",
  },
  AVAILABILITY_BLOCKED_EXCEEDS_AVAILABLE: {
    en: "Cannot block {{max}} rooms on {{date}} — not enough available rooms",
    ar: "لا يمكن حظر أكثر من {{max}} غرفة في {{date}} — لا تتوفر غرف كافية",
  },

  // ─── Bed Types ────────────────────────────────────────────
  BED_TYPE_king: { en: "King Bed", ar: "سرير كينج" },
  BED_TYPE_queen: { en: "Queen Bed", ar: "سرير كوين" },
  BED_TYPE_single: { en: "Single Bed", ar: "سرير مفرد" },
  BED_TYPE_double: { en: "Double Bed", ar: "سرير مزدوج" },
  BED_TYPE_twin: { en: "Twin Bed", ar: "سرير توأم" },
  BED_TYPE_sofa_bed: { en: "Sofa Bed", ar: "سرير أريكة" },
  BED_TYPE_bunk: { en: "Bunk Bed", ar: "سرير بطابقين" },

  // ─── Room Views ───────────────────────────────────────────
  VIEW_sea_view: { en: "Sea View", ar: "إطلالة بحرية" },
  VIEW_pool_view: { en: "Pool View", ar: "إطلالة على المسبح" },
  VIEW_city_view: { en: "City View", ar: "إطلالة على المدينة" },
  VIEW_garden_view: { en: "Garden View", ar: "إطلالة على الحديقة" },
  VIEW_mountain_view: { en: "Mountain View", ar: "إطلالة جبلية" },
  VIEW_landmark_view: { en: "Landmark View", ar: "إطلالة على معلم" },
  VIEW_courtyard_view: { en: "Courtyard View", ar: "إطلالة على الفناء" },
  VIEW_street_view: { en: "Street View", ar: "إطلالة على الشارع" },
  VIEW_open_view: { en: "Open View", ar: "إطلالة مفتوحة" },

  // ─── Amenities: Bathroom ──────────────────────────────────
  AMENITY_private_bathroom: { en: "Private Bathroom", ar: "حمام خاص" },
  AMENITY_bathtub: { en: "Bathtub", ar: "حوض استحمام" },
  AMENITY_shower: { en: "Shower", ar: "دش" },
  AMENITY_walk_in_shower: { en: "Walk-in Shower", ar: "دش مفتوح" },
  AMENITY_jacuzzi: { en: "Jacuzzi", ar: "جاكوزي" },
  AMENITY_bidet: { en: "Bidet", ar: "بيديه" },
  AMENITY_hair_dryer: { en: "Hair Dryer", ar: "مجفف شعر" },
  AMENITY_bathrobes: { en: "Bathrobes", ar: "أرواب حمام" },
  AMENITY_slippers: { en: "Slippers", ar: "شبشب" },
  AMENITY_free_toiletries: { en: "Free Toiletries", ar: "أدوات نظافة مجانية" },
  AMENITY_towels: { en: "Towels", ar: "مناشف" },

  // ─── Amenities: Bedroom & Living ──────────────────────────
  AMENITY_air_conditioning: { en: "Air Conditioning", ar: "تكييف" },
  AMENITY_wardrobe: { en: "Wardrobe", ar: "خزانة ملابس" },
  AMENITY_desk: { en: "Desk", ar: "مكتب" },
  AMENITY_sitting_area: { en: "Sitting Area", ar: "منطقة جلوس" },
  AMENITY_sofa: { en: "Sofa", ar: "أريكة" },
  AMENITY_iron: { en: "Iron", ar: "مكواة" },
  AMENITY_soundproofing: { en: "Soundproofing", ar: "عزل صوتي" },
  AMENITY_carpeted_floor: { en: "Carpeted Floor", ar: "أرضية مفروشة" },
  AMENITY_tiled_floor: { en: "Tiled Floor", ar: "أرضية بلاط" },
  AMENITY_blackout_curtains: { en: "Blackout Curtains", ar: "ستائر عاتمة" },
  AMENITY_connecting_rooms: { en: "Connecting Rooms", ar: "غرف متصلة" },

  // ─── Amenities: Media & Technology ────────────────────────
  AMENITY_tv: { en: "TV", ar: "تلفزيون" },
  AMENITY_flat_screen_tv: { en: "Flat-Screen TV", ar: "تلفزيون مسطح" },
  AMENITY_satellite_channels: { en: "Satellite Channels", ar: "قنوات فضائية" },
  AMENITY_wifi: { en: "WiFi", ar: "واي فاي" },
  AMENITY_telephone: { en: "Telephone", ar: "هاتف" },
  AMENITY_streaming_service: { en: "Streaming Service", ar: "خدمة بث" },
  AMENITY_socket_near_bed: { en: "Socket Near Bed", ar: "مقبس كهرباء قرب السرير" },

  // ─── Amenities: Kitchen & Dining ──────────────────────────
  AMENITY_minibar: { en: "Minibar", ar: "ميني بار" },
  AMENITY_coffee_maker: { en: "Coffee Maker", ar: "صانعة قهوة" },
  AMENITY_kettle: { en: "Kettle", ar: "غلاية" },
  AMENITY_refrigerator: { en: "Refrigerator", ar: "ثلاجة" },
  AMENITY_kitchenette: { en: "Kitchenette", ar: "مطبخ صغير" },
  AMENITY_microwave: { en: "Microwave", ar: "ميكروويف" },
  AMENITY_dining_area: { en: "Dining Area", ar: "منطقة طعام" },

  // ─── Amenities: Safety ────────────────────────────────────
  AMENITY_safe: { en: "Safe", ar: "خزنة" },
  AMENITY_smoke_alarm: { en: "Smoke Alarm", ar: "كاشف دخان" },
  AMENITY_fire_extinguisher: { en: "Fire Extinguisher", ar: "طفاية حريق" },
  AMENITY_key_card_access: { en: "Key Card Access", ar: "دخول بالبطاقة" },

  // ─── Amenities: General ───────────────────────────────────
  AMENITY_balcony: { en: "Balcony", ar: "شرفة" },
  AMENITY_terrace: { en: "Terrace", ar: "تراس" },
  AMENITY_room_service: { en: "Room Service", ar: "خدمة الغرف" },
  AMENITY_wake_up_service: { en: "Wake-up Service", ar: "خدمة إيقاظ" },
  AMENITY_private_entrance: { en: "Private Entrance", ar: "مدخل خاص" },

  // ─── Smoking Policy ───────────────────────────────────────
  SMOKING_non_smoking: { en: "Non-Smoking", ar: "غير مسموح بالتدخين" },
  SMOKING_smoking: { en: "Smoking Allowed", ar: "مسموح بالتدخين" },

  // ─── Accessibility ────────────────────────────────────────
  ACCESSIBILITY_wheelchair_accessible: { en: "Wheelchair Accessible", ar: "مناسب للكراسي المتحركة" },
  ACCESSIBILITY_roll_in_shower: { en: "Roll-in Shower", ar: "دش بدون عتبة" },
  ACCESSIBILITY_toilet_with_grab_rails: { en: "Toilet with Grab Rails", ar: "مرحاض بمقابض" },
  ACCESSIBILITY_elevated_toilet: { en: "Elevated Toilet", ar: "مرحاض مرتفع" },
  ACCESSIBILITY_low_bathroom_sink: { en: "Low Bathroom Sink", ar: "مغسلة منخفضة" },
  ACCESSIBILITY_emergency_pull_cord: { en: "Emergency Pull Cord", ar: "حبل طوارئ" },

  // ─── Reservation Options ──────────────────────────────────
  RESERVATION_room_only: { en: "Room Only", ar: "غرفة فقط" },
  RESERVATION_breakfast: { en: "With Breakfast", ar: "مع إفطار" },
  RESERVATION_half_board: { en: "Half Board", ar: "نصف إقامة" },
  RESERVATION_full_board: { en: "Full Board", ar: "إقامة كاملة" },

  // ─── Cancellation Policies ────────────────────────────────
  CANCELLATION_free_cancellation: {
    en: "Free Cancellation",
    ar: "إلغاء مجاني",
  },
  CANCELLATION_non_refundable: {
    en: "Non-Refundable",
    ar: "غير قابل للاسترداد",
  },

  // ─── Payment Options ──────────────────────────────────────
  PAYMENT_pay_now: { en: "Pay Now", ar: "ادفع الآن" },
  PAYMENT_pay_at_hotel: { en: "Pay at Hotel", ar: "الدفع في الفندق" },
};
