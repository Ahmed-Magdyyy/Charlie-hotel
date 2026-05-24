/**
 * Unified Notification Dispatcher (In-App Only)
 *
 * Single entry point for dispatching in-app notifications from any module.
 * No push notifications, no sockets — React FE polls via REST API.
 *
 * Usage:
 *   import { dispatchNotification } from "../notification/notificationDispatcher.js";
 *
 *   await dispatchNotification({
 *     userId: "...",
 *     title_en: "Booking Confirmed",
 *     title_ar: "تم تأكيد الحجز",
 *     body_en: "Your booking #123 is confirmed",
 *     body_ar: "تم تأكيد حجزك #123",
 *     icon: "booking",
 *     action: { type: "booking_detail", route: "/bookings/123", params: { bookingId: "123" } },
 *     source: { domain: "booking", event: "confirmed", referenceId: "123" },
 *   });
 */

import {
  createNotificationService,
  createBulkNotificationsService,
} from "./notification.service.js";

/**
 * Auto-expiry days based on notification source domain
 * Booking/payment: 6 months (important for reference)
 * Others: shorter TTLs based on relevance
 */
const EXPIRY_DAYS_BY_DOMAIN = {
  booking: 180,       // 6 months
  payment: 180,       // 6 months
  loyalty: 30,        // 1 month
  admin: 30,          // 1 month (promos / custom)
  default: 30,        // 1 month fallback
};

/**
 * Compute expiresAt date based on source domain
 */
function computeExpiresAt(source, providedExpiresAt) {
  if (providedExpiresAt) {
    return providedExpiresAt;
  }

  const domain = source?.domain || "default";
  const days = EXPIRY_DAYS_BY_DOMAIN[domain] ?? EXPIRY_DAYS_BY_DOMAIN.default;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt;
}

/**
 * Dispatch in-app notification to a single user
 *
 * @param {Object} params
 * @param {string} params.userId - Target user ID
 * @param {string} params.title_en - English title
 * @param {string} params.title_ar - Arabic title (falls back to title_en)
 * @param {string} params.body_en - English body
 * @param {string} params.body_ar - Arabic body (falls back to body_en)
 * @param {string} params.icon - Icon type for in-app display
 * @param {Object} params.action - { type, route, params } for FE deep linking
 * @param {Object} params.source - { domain, event, referenceId } for tracking
 * @param {Date} params.expiresAt - Optional explicit expiry
 */
export async function dispatchNotification({
  userId,
  title_en,
  title_ar,
  body_en,
  body_ar,
  icon = "system",
  action,
  source,
  expiresAt,
}) {
  if (!userId) {
    return { success: false, reason: "no_userId" };
  }

  try {
    const result = await createNotificationService({
      userId,
      title_en: title_en || "",
      title_ar,
      body_en: body_en || "",
      body_ar,
      icon,
      action,
      source,
      expiresAt: computeExpiresAt(source, expiresAt),
    });

    return { success: !!result };
  } catch (err) {
    console.error("[NotificationDispatcher] Failed to create in-app notification:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Dispatch in-app notification to multiple users
 *
 * @param {Object} params
 * @param {string[]} params.userIds - Target user IDs
 * @param {string} params.title_en - English title
 * @param {string} params.title_ar - Arabic title
 * @param {string} params.body_en - English body
 * @param {string} params.body_ar - Arabic body
 * @param {string} params.icon - Icon type
 * @param {Object} params.action - { type, route, params }
 * @param {Object} params.source - { domain, event, referenceId }
 * @param {Date} params.expiresAt - Optional explicit expiry
 */
export async function dispatchNotificationToUsers({
  userIds,
  title_en,
  title_ar,
  body_en,
  body_ar,
  icon = "system",
  action,
  source,
  expiresAt,
}) {
  const ids = Array.isArray(userIds)
    ? Array.from(new Set(userIds.map((id) => String(id))))
    : [];

  if (!ids.length) {
    return { success: false, reason: "no_userIds" };
  }

  try {
    const result = await createBulkNotificationsService({
      userIds: ids,
      title_en: title_en || "",
      title_ar,
      body_en: body_en || "",
      body_ar,
      icon,
      action,
      source,
      expiresAt: computeExpiresAt(source, expiresAt),
    });

    return { success: true, ...result };
  } catch (err) {
    console.error("[NotificationDispatcher] Failed to create bulk in-app notifications:", err.message);
    return { success: false, error: err.message };
  }
}
