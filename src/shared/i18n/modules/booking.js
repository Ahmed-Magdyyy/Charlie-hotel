// src/shared/i18n/modules/booking.js
// Booking module messages

export default {
  // ─── Validation Errors ────────────────────────────────────
  INVALID_RESERVATION_OPTION: {
    en: "Invalid reservation option for this room type",
    ar: "خيار الحجز غير صالح لهذا النوع من الغرف",
  },
  INVALID_CANCELLATION_POLICY: {
    en: "Invalid cancellation policy for this room type",
    ar: "سياسة الإلغاء غير صالحة لهذا النوع من الغرف",
  },
  INVALID_PAYMENT_OPTION: {
    en: "Invalid payment option for this room type",
    ar: "خيار الدفع غير صالح لهذا النوع من الغرف",
  },
  GUESTS_EXCEED_MAX: {
    en: "Number of guests exceeds the room's maximum capacity",
    ar: "عدد الضيوف يتجاوز السعة القصوى للغرفة",
  },
  ROOM_NOT_AVAILABLE: {
    en: "Room type is not available for the selected dates",
    ar: "نوع الغرفة غير متاح للتواريخ المحددة",
  },
  BOOKING_NOT_FOUND: {
    en: "Booking not found",
    ar: "لم يتم العثور على الحجز",
  },

  // ─── Status Transitions ───────────────────────────────────
  INVALID_STATUS_TRANSITION: {
    en: "Cannot change booking status from {{from}} to {{to}}",
    ar: "لا يمكن تغيير حالة الحجز من {{from}} إلى {{to}}",
  },
  BOOKING_ALREADY_CANCELLED: {
    en: "This booking is already cancelled",
    ar: "هذا الحجز ملغى بالفعل",
  },
  CANCELLATION_DEADLINE_PASSED: {
    en: "Cancellation deadline has passed",
    ar: "انتهت مهلة الإلغاء",
  },

  // ─── Success Messages ────────────────────────────────────
  BOOKING_CREATED: {
    en: "Booking created successfully",
    ar: "تم إنشاء الحجز بنجاح",
  },
  BOOKING_CANCELLED: {
    en: "Booking cancelled successfully",
    ar: "تم إلغاء الحجز بنجاح",
  },
  BOOKING_STATUS_UPDATED: {
    en: "Booking status updated to {{status}}",
    ar: "تم تحديث حالة الحجز إلى {{status}}",
  },
};
