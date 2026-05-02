import { ApiError } from "../../shared/utils/ApiError.js";
import { t } from "../../shared/i18n/index.js";
import { UserModel } from "../user/user.model.js";
import { getTierConfig, updateTierConfig } from "./tier.repository.js";

// ─── Config ────────────────────────────────────────────────

export async function getConfigService() {
  return getTierConfig();
}

export async function updateConfigService(body, lang) {
  // Validate tiers are sorted by minSpent ascending
  if (body.tiers) {
    for (let i = 1; i < body.tiers.length; i++) {
      if (body.tiers[i].minSpent <= body.tiers[i - 1].minSpent) {
        throw new ApiError(
          "Tiers must be sorted by minSpent in ascending order",
          400,
        );
      }
    }
    // First tier must start at 0
    if (body.tiers[0].minSpent !== 0) {
      throw new ApiError(
        "The first tier must have minSpent = 0 (default tier for new users)",
        400,
      );
    }
  }

  return updateTierConfig(body);
}

// ─── Tier Helpers ──────────────────────────────────────────

/**
 * Determine which tier a user belongs to based on their totalSpent.
 * Tiers are sorted by minSpent ascending — pick the highest tier whose
 * minSpent threshold the user has reached.
 *
 * @param {number} totalSpent - User's total historical spend in SAR
 * @returns {Promise<Object>} - { name, discountRate, minSpent }
 */
export async function resolveTier(totalSpent = 0) {
  const config = await getTierConfig();

  if (!config.isActive || !config.tiers?.length) {
    return { name: "premier", discountRate: 0, minSpent: 0 };
  }

  // Tiers are stored sorted by minSpent ascending.
  // Walk backwards to find the highest tier the user qualifies for.
  const sorted = [...config.tiers].sort((a, b) => a.minSpent - b.minSpent);
  let resolved = sorted[0]; // default: first tier (premier)

  for (const tier of sorted) {
    if (totalSpent >= tier.minSpent) {
      resolved = tier;
    } else {
      break;
    }
  }

  return resolved;
}

/**
 * Get a user's current tier info.
 * Reads from the user doc and resolves against current tier config.
 */
export async function getUserTierService(userId, lang) {
  const user = await UserModel.findById(userId)
    .select("tier totalSpent firstName lastName")
    .lean();

  if (!user) {
    throw new ApiError(t("loyalty.USER_NOT_FOUND", lang), 404);
  }

  const config = await getTierConfig();
  const currentTier = await resolveTier(user.totalSpent || 0);

  // Find next tier
  const sorted = [...(config.tiers || [])].sort(
    (a, b) => a.minSpent - b.minSpent,
  );
  const currentIdx = sorted.findIndex((t) => t.name === currentTier.name);
  const nextTier =
    currentIdx < sorted.length - 1 ? sorted[currentIdx + 1] : null;

  return {
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    totalSpent: user.totalSpent || 0,
    currentTier: {
      name: currentTier.name,
      discountRate: currentTier.discountRate,
    },
    nextTier: nextTier
      ? {
          name: nextTier.name,
          discountRate: nextTier.discountRate,
          remainingSpend: Math.max(
            0,
            nextTier.minSpent - (user.totalSpent || 0),
          ),
        }
      : null,
  };
}

/**
 * Promote a user's tier based on their updated totalSpent.
 * Called after a booking is checked out.
 *
 * @param {string} userId
 * @param {number} grandTotal - SAR amount to add to totalSpent
 * @param {Object} [session] - Mongoose session for transactions
 * @returns {Promise<Object>} - Updated tier info
 */
export async function updateUserSpentAndTier(userId, grandTotal, session) {
  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $inc: { totalSpent: grandTotal } },
    { returnDocument: "after", session },
  );

  const newTier = await resolveTier(user.totalSpent);

  // Only update tier name if it changed
  if (user.tier !== newTier.name) {
    user.tier = newTier.name;
    await user.save({ session });
  }

  return { tier: newTier.name, totalSpent: user.totalSpent };
}
