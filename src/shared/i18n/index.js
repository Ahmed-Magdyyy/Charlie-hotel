// src/shared/i18n/index.js
import common from "./common.js";
import auth from "./modules/auth.js";
import user from "./modules/user.js";
import room from "./modules/room.js";
import booking from "./modules/booking.js";
import payment from "./modules/payment.js";
import loyalty from "./modules/loyalty.js";
import tier from "./modules/tier.js";
import analytics from "./modules/analytics.js";
import enumLabels from "./modules/enumLabels.js";
import notification from "./modules/notification.js";

const messages = { common, auth, user, room, booking, payment, loyalty, tier, analytics, notification };

/**
 * Translate a message key to the given language.
 * @param {string} key - Dot-notation key, e.g. "auth.EMAIL_ALREADY_EXISTS" or "common.NOT_FOUND"
 * @param {string} [lang="en"] - Language code ("en" or "ar")
 * @returns {string} Translated message, falls back to English, then returns the raw key.
 */
export function t(key, lang = "en", vars = {}) {
  const [module, msgKey] = key.split(".");
  const msg = messages[module]?.[msgKey];
  let text = msg?.[lang] || msg?.["en"] || key;
  for (const [k, v] of Object.entries(vars)) {
    text = text.replaceAll(`{{${k}}}`, v);
  }
  return text;
}

/**
 * Translate a raw enum value to a human-readable label.
 * Falls back to the raw value if no label is found.
 * @param {string} value - The raw enum value, e.g. "breakfast"
 * @param {string} [lang="en"] - Language code
 * @returns {string} Translated label, e.g. "إفطار" for lang="ar"
 */
export function translateEnum(value, lang = "en") {
  const label = enumLabels[value];
  return label?.[lang] || label?.["en"] || value;
}
