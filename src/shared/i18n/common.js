// src/shared/i18n/common.js
// Shared messages used across all modules

export default {
  // ── Generic Success ──
  SUCCESS: {
    en: "Success",
    ar: "تمت العملية بنجاح",
  },
  DELETED_SUCCESSFULLY: {
    en: "Deleted successfully",
    ar: "تم الحذف بنجاح",
  },

  // ── Generic Errors ──
  NOT_FOUND: {
    en: "Resource not found",
    ar: "المورد غير موجود",
  },
  SOMETHING_WENT_WRONG: {
    en: "Something went very wrong!",
    ar: "حدث خطأ غير متوقع!",
  },
  VALIDATION_ERROR: {
    en: "Validation error",
    ar: "خطأ في البيانات المدخلة",
  },
  ROUTE_NOT_FOUND: {
    en: "Cannot find this route",
    ar: "هذا المسار غير موجود",
  },

  // ── Auth Guards / Middleware ──
  LOGIN_REQUIRED: {
    en: "Please login first",
    ar: "يرجى تسجيل الدخول أولاً",
  },
  INVALID_OR_EXPIRED_TOKEN: {
    en: "Invalid or expired token, please login again",
    ar: "رمز غير صالح أو منتهي الصلاحية، يرجى تسجيل الدخول مرة أخرى",
  },
  USER_NO_LONGER_EXISTS: {
    en: "User no longer exists",
    ar: "المستخدم لم يعد موجوداً",
  },
  ACCOUNT_BANNED_SUSPENDED: {
    en: "Your account has been banned/suspended. Please contact support",
    ar: "تم حظر/تعليق حسابك. يرجى التواصل مع الدعم",
  },
  PASSWORD_CHANGED_LOGIN_AGAIN: {
    en: "Password was changed recently, please login again",
    ar: "تم تغيير كلمة المرور مؤخراً، يرجى تسجيل الدخول مرة أخرى",
  },
  ACCOUNT_NOT_ACTIVE: {
    en: "Account is not active. Contact customer support",
    ar: "الحساب غير نشط. تواصل مع خدمة العملاء",
  },
  NOT_ALLOWED: {
    en: "You are not allowed to access this route",
    ar: "غير مصرح لك بالوصول إلى هذا المسار",
  },
  NO_PERMISSION: {
    en: "You do not have permission to perform this action",
    ar: "ليس لديك صلاحية للقيام بهذا الإجراء",
  },
  PERMISSION_MISSING: {
    en: "Required permission is missing",
    ar: "الصلاحية المطلوبة غير متوفرة",
  },

  // ── DB / System Errors ──
  INVALID_TOKEN_LOGIN_AGAIN: {
    en: "Invalid token, Please login again",
    ar: "رمز غير صالح، يرجى تسجيل الدخول مرة أخرى",
  },
  EXPIRED_TOKEN_LOGIN_AGAIN: {
    en: "Expired token, Please login again",
    ar: "انتهت صلاحية الرمز، يرجى تسجيل الدخول مرة أخرى",
  },
  DUPLICATE_VALUE: {
    en: "Duplicate value entered. Please use a different value.",
    ar: "القيمة مكررة. يرجى استخدام قيمة مختلفة.",
  },
  FILE_TOO_LARGE: {
    en: "Uploaded file is too large",
    ar: "الملف المرفوع كبير جداً",
  },
  INVALID_FILE_UPLOAD: {
    en: "Invalid file upload",
    ar: "ملف غير صالح",
  },
};
