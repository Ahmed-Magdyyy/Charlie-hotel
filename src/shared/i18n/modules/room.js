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

  // ─── Bed Types ────────────────────────────────────────────
  BED_TYPE_king: { en: "King Bed", ar: "سرير كينج" },
  BED_TYPE_queen: { en: "Queen Bed", ar: "سرير كوين" },
  BED_TYPE_single: { en: "Single Bed", ar: "سرير مفرد" },
  BED_TYPE_double: { en: "Double Bed", ar: "سرير مزدوج" },
  BED_TYPE_sofa_bed: { en: "Sofa Bed", ar: "سرير أريكة" },
  BED_TYPE_bunk: { en: "Bunk Bed", ar: "سرير بطابقين" },

  // ─── Amenities ────────────────────────────────────────────
  AMENITY_wifi: { en: "WiFi", ar: "واي فاي" },
  AMENITY_air_conditioning: { en: "Air Conditioning", ar: "تكييف" },
  AMENITY_minibar: { en: "Minibar", ar: "ميني بار" },
  AMENITY_balcony: { en: "Balcony", ar: "شرفة" },
  AMENITY_room_service: { en: "Room Service", ar: "خدمة الغرف" },
  AMENITY_safe: { en: "Safe", ar: "خزنة" },
  AMENITY_tv: { en: "TV", ar: "تلفزيون" },
  AMENITY_jacuzzi: { en: "Jacuzzi", ar: "جاكوزي" },
  AMENITY_bathtub: { en: "Bathtub", ar: "حوض استحمام" },
  AMENITY_shower: { en: "Shower", ar: "دش" },
  AMENITY_hair_dryer: { en: "Hair Dryer", ar: "مجفف شعر" },
  AMENITY_iron: { en: "Iron", ar: "مكواة" },
  AMENITY_coffee_maker: { en: "Coffee Maker", ar: "صانعة قهوة" },
  AMENITY_kettle: { en: "Kettle", ar: "غلاية" },
  AMENITY_desk: { en: "Desk", ar: "مكتب" },
  AMENITY_wardrobe: { en: "Wardrobe", ar: "خزانة ملابس" },
  AMENITY_telephone: { en: "Telephone", ar: "هاتف" },
  AMENITY_slippers: { en: "Slippers", ar: "شبشب" },
  AMENITY_bathrobes: { en: "Bathrobes", ar: "أرواب حمام" },

  // ─── Views ────────────────────────────────────────────────
  VIEW_pool_view: { en: "Pool View", ar: "إطلالة على المسبح" },
  VIEW_sea_view: { en: "Sea View", ar: "إطلالة بحرية" },
  VIEW_city_view: { en: "City View", ar: "إطلالة على المدينة" },
  VIEW_garden_view: { en: "Garden View", ar: "إطلالة على الحديقة" },
  VIEW_open_view: { en: "Open View", ar: "إطلالة مفتوحة" },

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
