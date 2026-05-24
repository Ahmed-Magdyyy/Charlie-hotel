import mongoose from "mongoose";

const { Schema, model } = mongoose;

/**
 * In-App Notification Schema
 *
 * Stores persistent notifications for users to view in-app.
 * Supports i18n (title_en/ar, body_en/ar) and deep linking via action object.
 */
const inAppNotificationSchema = new Schema(
  {
    // Recipient (required for in-app)
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Display content (i18n)
    title_en: {
      type: String,
      required: true,
    },
    title_ar: {
      type: String,
    },
    body_en: {
      type: String,
      required: true,
    },
    body_ar: {
      type: String,
    },

    // Visual icon type for FE to display appropriate icon
    icon: {
      type: String,
      enum: [
        "booking",
        "payment",
        "loyalty",
        "system",
        "promo",
      ],
      default: "system",
    },

    // Navigation action for FE deep linking (React router)
    action: {
      type: {
        type: String,
        // e.g., "booking_detail", "payment_detail"
      },
      route: {
        type: String,
        // React route, e.g., "/bookings/123", "/loyalty"
      },
      params: {
        type: Schema.Types.Mixed,
        // e.g., { bookingId: "..." }
      },
    },

    // Source tracking for debugging and analytics
    source: {
      domain: {
        type: String,
        // e.g., "booking", "payment", "loyalty", "admin"
      },
      event: {
        type: String,
        // e.g., "status_changed", "confirmed", "points_earned"
      },
      referenceId: {
        type: String,
        // e.g., bookingId for linking back
      },
    },

    // Read status
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },

    // Optional expiry (notifications can be auto-deleted after this date)
    expiresAt: {
      type: Date,
      index: true,
    },
  },
  { timestamps: true },
);

// Compound indexes for efficient user notification queries
inAppNotificationSchema.index({ user: 1, createdAt: -1 });
inAppNotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

export const InAppNotificationModel = model(
  "InAppNotification",
  inAppNotificationSchema,
);
