import cron from "node-cron";
import { deleteExpiredNotificationsService } from "../../modules/notification/notification.service.js";

/**
 * Notification Cleanup Job
 *
 * Runs daily at 03:00 AM to delete expired in-app notifications.
 * Same pattern as bookingExpiryJob.js.
 */
export function startNotificationCleanupJob() {
  // Run daily at 3:00 AM
  cron.schedule("0 3 * * *", async () => {
    try {
      const result = await deleteExpiredNotificationsService();
      if (result.deletedCount > 0) {
        console.log(
          `[NotificationCleanup] Deleted ${result.deletedCount} expired notification(s).`,
        );
      }
    } catch (err) {
      console.error(
        "[NotificationCleanup] Failed to clean up expired notifications:",
        err.message,
      );
    }
  });

  console.log("[NotificationCleanup] Scheduled daily at 03:00 AM.");
}
