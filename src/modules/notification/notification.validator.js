import { body, param, query } from "express-validator";
import { validatorMiddleware } from "../../shared/middlewares/validatorMiddleware.js";

// =====================
// User Notification Validators
// =====================

export const listNotificationsQueryValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("limit must be between 1 and 50"),

  query("isRead")
    .optional()
    .isIn(["true", "false"])
    .withMessage("isRead must be 'true' or 'false'"),

  validatorMiddleware,
];

export const notificationIdParamValidator = [
  param("id")
    .isMongoId()
    .withMessage("Invalid notification id"),

  validatorMiddleware,
];

// =====================
// Admin Send Notification
// =====================

export const adminSendNotificationValidator = [
  body("target.type")
    .notEmpty()
    .withMessage("target.type is required")
    .isIn(["users", "all_users"])
    .withMessage("target.type must be 'users' or 'all_users'"),

  body("target.userIds")
    .optional()
    .isArray({ min: 1 })
    .withMessage("target.userIds must be a non-empty array"),

  body("target.userIds.*")
    .optional()
    .isMongoId()
    .withMessage("each user id must be a valid Mongo id"),

  // Notification content
  body("notification")
    .notEmpty()
    .withMessage("notification is required")
    .isObject()
    .withMessage("notification must be an object"),

  body("notification")
    .custom((value) => {
      const hasTitle = value.title || value.title_en;
      const hasBody = value.body || value.body_en;
      if (!hasTitle) {
        throw new Error("notification.title or notification.title_en is required");
      }
      if (!hasBody) {
        throw new Error("notification.body or notification.body_en is required");
      }
      return true;
    }),

  // Icon type
  body("icon")
    .optional()
    .isIn(["booking", "payment", "loyalty", "system", "promo"])
    .withMessage("icon must be one of: booking, payment, loyalty, system, promo"),

  // Action for deep linking
  body("action")
    .optional()
    .isObject()
    .withMessage("action must be an object"),

  body("action.type")
    .optional()
    .isString()
    .withMessage("action.type must be a string"),

  body("action.route")
    .optional()
    .isString()
    .withMessage("action.route must be a string"),

  body("action.params")
    .optional()
    .isObject()
    .withMessage("action.params must be an object"),

  validatorMiddleware,
];
