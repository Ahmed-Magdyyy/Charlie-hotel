import { Router } from "express";
import { protect, allowedTo, requirePermission } from "../auth/auth.middleware.js";
import { roles } from "../../shared/constants/enums.js";
import {
  getMyNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  adminSendNotification,
} from "./notification.controller.js";
import {
  listNotificationsQueryValidator,
  notificationIdParamValidator,
  adminSendNotificationValidator,
} from "./notification.validator.js";

const router = Router();

// All routes require authentication
router.use(protect);

// =====================
// User In-App Notifications
// =====================

router.get(
  "/me",
  listNotificationsQueryValidator,
  getMyNotifications,
);

router.get(
  "/me/unread-count",
  getUnreadCount,
);

router.patch(
  "/me/:id/read",
  notificationIdParamValidator,
  markNotificationAsRead,
);

router.patch(
  "/me/read-all",
  markAllNotificationsAsRead,
);

router.delete(
  "/me/:id",
  notificationIdParamValidator,
  deleteNotification,
);

// =====================
// Admin Send Notification
// =====================

router.post(
  "/admin/send",
  requirePermission("notifications", "create"),
  adminSendNotificationValidator,
  adminSendNotification,
);

export default router;
