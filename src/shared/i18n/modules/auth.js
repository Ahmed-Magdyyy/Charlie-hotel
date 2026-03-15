// src/shared/i18n/modules/auth.js
// Auth module specific messages

export default {
  // ── Signup ──
  EMAIL_ALREADY_EXISTS: {
    en: "Email already exists",
    ar: "البريد الإلكتروني مسجل بالفعل",
  },
  OTP_SENT: {
    en: "An OTP has been sent to your email. Please verify.",
    ar: "تم إرسال رمز التحقق إلى بريدك الإلكتروني. يرجى التحقق.",
  },
  OTP_RESENT: {
    en: "An OTP has been sent to your email.",
    ar: "تم إرسال رمز التحقق إلى بريدك الإلكتروني.",
  },
  OTP_RATE_LIMIT: {
    en: "Limit reached for sending OTPs today. Please try again tomorrow.",
    ar: "تم الوصول للحد الأقصى لإرسال رموز التحقق اليوم. حاول مرة أخرى غداً.",
  },

  // ── Verify Email ──
  INVALID_OR_EXPIRED_OTP: {
    en: "Invalid or Expired OTP.",
    ar: "رمز التحقق غير صالح أو منتهي الصلاحية.",
  },
  EMAIL_ALREADY_VERIFIED: {
    en: "Email already verified.",
    ar: "البريد الإلكتروني مُفعّل بالفعل.",
  },

  // ── Login ──
  INVALID_CREDENTIALS: {
    en: "Invalid email or password.",
    ar: "بريد إلكتروني أو كلمة مرور غير صحيحة.",
  },
  VERIFY_EMAIL_BEFORE_LOGIN: {
    en: "Please verify your email before logging in.",
    ar: "يرجى تفعيل بريدك الإلكتروني قبل تسجيل الدخول.",
  },
  ACCOUNT_DELETED: {
    en: "Account is deleted.",
    ar: "الحساب محذوف. يرجى التواصل مع الدعم",
  },
  ACCOUNT_INACTIVE_SUSPENDED: {
    en: "Account is inactive or suspended.",
    ar: "الحساب غير نشط أو معلّق. يرجى التواصل مع الدعم",
  },

  // ── Forget / Reset Password ──
  USER_NOT_FOUND: {
    en: "User not found.",
    ar: "المستخدم غير موجود.",
  },
  RESET_CODE_SENT: {
    en: "Password reset code sent to your email.",
    ar: "تم إرسال رمز إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.",
  },
  INVALID_OR_EXPIRED_RESET_CODE: {
    en: "Invalid or expired reset code.",
    ar: "رمز إعادة التعيين غير صالح أو منتهي الصلاحية.",
  },
  RESET_CODE_VERIFIED: {
    en: "Reset code verified.",
    ar: "تم التحقق من رمز إعادة التعيين.",
  },
  RESET_CODE_NOT_VERIFIED: {
    en: "Reset code not verified.",
    ar: "لم يتم التحقق من رمز إعادة التعيين.",
  },
  PASSWORD_CHANGED: {
    en: "Password changed successfully.",
    ar: "تم تغيير كلمة المرور بنجاح.",
  },

  // ── Refresh Token ──
  NO_REFRESH_TOKEN: {
    en: "No refresh token provided.",
    ar: "لم يتم تقديم رمز التحديث.",
  },
  INVALID_REFRESH_TOKEN: {
    en: "Invalid or expired refresh token.",
    ar: "رمز التحديث غير صالح أو منتهي الصلاحية.",
  },
  REFRESH_TOKEN_REUSE: {
    en: "Session invalidated. Please log in again.",
    ar: "تم إبطال الجلسة. يرجى تسجيل الدخول مرة أخرى.",
  },

  // ── Logout ──
  LOGGED_OUT: {
    en: "Logged out successfully.",
    ar: "تم تسجيل الخروج بنجاح.",
  },
};
