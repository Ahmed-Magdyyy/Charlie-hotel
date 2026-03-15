// src/shared/i18n/modules/user.js
// User module specific messages

export default {
  // ── Admin CRUD ──
  USER_NOT_FOUND: {
    en: "No user found for this id",
    ar: "لم يتم العثور على مستخدم لهذا المعرّف",
  },
  USER_ALREADY_EXISTS: {
    en: "User with this email or phone already exists.",
    ar: "يوجد مستخدم مسجل بهذا البريد الإلكتروني أو رقم الهاتف.",
  },
  USER_DELETED: {
    en: "User deleted successfully",
    ar: "تم حذف المستخدم بنجاح",
  },
  ADMIN_CANNOT_BE_DELETED: {
    en: "Admins cannot be soft deleted through this endpoint.",
    ar: "لا يمكن حذف المسؤولين من خلال هذه النقطة.",
  },
  ADMIN_CANNOT_TOGGLE_ACTIVE: {
    en: "Admins active status cannot be toggled.",
    ar: "لا يمكن تغيير حالة نشاط المسؤولين.",
  },
  USER_ACTIVE_TOGGLED: {
    en: "User active status changed successfully",
    ar: "تم تغيير حالة نشاط المستخدم بنجاح",
  },

  // ── Logged-in User ──
  CURRENT_PASSWORD_INCORRECT: {
    en: "Current password is incorrect",
    ar: "كلمة المرور الحالية غير صحيحة",
  },
  PASSWORD_CHANGED: {
    en: "Password changed successfully",
    ar: "تم تغيير كلمة المرور بنجاح",
  },
  ACCOUNT_DELETED: {
    en: "Account deleted successfully",
    ar: "تم حذف الحساب بنجاح",
  },
};
