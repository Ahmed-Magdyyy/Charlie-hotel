import asyncHandler from "express-async-handler";
import { ApiError } from "../../shared/utils/ApiError.js";
import { t } from "../../shared/i18n/index.js";
import {
  getMyNotificationsService,
  getUnreadCountService,
  markNotificationAsReadService,
  markAllNotificationsAsReadService,
  deleteNotificationService,
} from "./notification.service.js";
import {
  dispatchNotification,
  dispatchNotificationToUsers,
} from "./notificationDispatcher.js";
import { UserModel } from "../user/user.model.js";

// =====================
// User In-App Notifications
// =====================

// GET /api/v1/notifications/me
export const getMyNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, isRead } = req.query;

  const data = await getMyNotificationsService({
    userId: req.user._id,
    lang: req.lang,
    page: parseInt(page, 10) || 1,
    limit: Math.min(parseInt(limit, 10) || 20, 50),
    isRead,
  });

  res.status(200).json({ status: "success", ...data });
});

// GET /api/v1/notifications/me/unread-count
export const getUnreadCount = asyncHandler(async (req, res) => {
  const data = await getUnreadCountService(req.user._id);

  res.status(200).json({ status: "success", data });
});

// PATCH /api/v1/notifications/me/:id/read
export const markNotificationAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await markNotificationAsReadService({
    userId: req.user._id,
    notificationId: id,
  });

  if (!result.success) {
    throw new ApiError(t("notification.NOT_FOUND", req.lang), 404);
  }

  res.status(200).json({
    status: "success",
    message: t("notification.MARKED_AS_READ", req.lang),
  });
});

// PATCH /api/v1/notifications/me/read-all
export const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const data = await markAllNotificationsAsReadService(req.user._id);

  res.status(200).json({
    status: "success",
    message: t("notification.ALL_MARKED_AS_READ", req.lang),
    data,
  });
});

// DELETE /api/v1/notifications/me/:id
export const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await deleteNotificationService({
    userId: req.user._id,
    notificationId: id,
  });

  if (!result.deleted) {
    throw new ApiError(t("notification.NOT_FOUND", req.lang), 404);
  }

  res.status(200).json({
    status: "success",
    message: t("notification.DELETED", req.lang),
  });
});

// =====================
// Admin Send Notification
// =====================

// POST /api/v1/notifications/admin/send
export const adminSendNotification = asyncHandler(async (req, res) => {
  const { target, notification, icon, action } = req.body || {};

  const targetType = target && target.type;

  const source = {
    domain: "admin",
    event: "custom",
  };

  if (targetType === "users") {
    const userIds = Array.isArray(target.userIds) ? target.userIds : [];

    if (!userIds.length) {
      throw new ApiError(t("notification.USER_IDS_REQUIRED", req.lang), 400);
    }

    const result = await dispatchNotificationToUsers({
      userIds,
      title_en: notification?.title_en || notification?.title || "",
      title_ar: notification?.title_ar,
      body_en: notification?.body_en || notification?.body || "",
      body_ar: notification?.body_ar,
      icon: icon || "promo",
      action,
      source,
    });

    res.status(200).json({ status: "success", data: result });
    return;
  }

  if (targetType === "all_users") {
    // Get all active user IDs
    const users = await UserModel.find({ isActive: true }).select("_id").lean();
    const userIds = users.map((u) => String(u._id));

    if (!userIds.length) {
      res.status(200).json({
        status: "success",
        data: { success: true, insertedCount: 0 },
      });
      return;
    }

    const result = await dispatchNotificationToUsers({
      userIds,
      title_en: notification?.title_en || notification?.title || "",
      title_ar: notification?.title_ar,
      body_en: notification?.body_en || notification?.body || "",
      body_ar: notification?.body_ar,
      icon: icon || "promo",
      action,
      source,
    });

    res.status(200).json({ status: "success", data: result });
    return;
  }

  throw new ApiError(t("notification.INVALID_TARGET_TYPE", req.lang), 400);
});
