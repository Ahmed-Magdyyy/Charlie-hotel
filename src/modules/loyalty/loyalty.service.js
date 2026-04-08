import mongoose from "mongoose";
import { ApiError } from "../../shared/utils/ApiError.js";
import { t } from "../../shared/i18n/index.js";
import { UserModel } from "../user/user.model.js";
import {
  getLoyaltyConfig,
  updateLoyaltyConfig,
  createLoyaltyTransaction,
  findTransactionsByUser,
  countTransactionsByUser,
} from "./loyalty.repository.js";
import { loyaltyTransactionTypes } from "./loyaltyTransaction.model.js";
import { buildPagination } from "../../shared/utils/apiFeatures.js";

// ─── Config ────────────────────────────────────────────────

export async function getConfigService() {
  return getLoyaltyConfig();
}

export async function updateConfigService(body, lang) {
  return updateLoyaltyConfig(body);
}

// ─── My Balance & History (Client) ─────────────────────────

export async function getMyLoyaltyService(user, queryParams) {
  const { page, limit } = queryParams;
  const totalCount = await countTransactionsByUser(user._id);
  const { pageNum, limitNum, skip } = buildPagination({ page, limit }, 10);

  const transactions = await findTransactionsByUser(user._id, {
    skip,
    limit: limitNum,
    populate: { path: "booking", select: "bookingNumber" },
  });

  return {
    balance: user.loyaltyPoints || 0,
    totalPages: Math.ceil(totalCount / limitNum) || 1,
    page: pageNum,
    results: transactions.length,
    transactions,
  };
}

// ─── Earn Points (called after checkout) ───────────────────

export async function earnPointsService(userId, bookingId, grandTotal, session) {
  const config = await getLoyaltyConfig();
  if (!config.isActive) return 0;

  const points = Math.floor(grandTotal * config.earnRate);
  if (points <= 0) return 0;

  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $inc: { loyaltyPoints: points } },
    { new: true, session },
  );

  await createLoyaltyTransaction(
    {
      user: userId,
      booking: bookingId,
      type: loyaltyTransactionTypes.EARNED,
      points,
      balanceAfter: user.loyaltyPoints,
      description: `Earned from booking checkout`,
    },
    session,
  );

  return points;
}

// ─── Redeem Points (called during booking creation) ────────

export async function redeemPointsService(userId, bookingId, pointsToRedeem, session) {
  const config = await getLoyaltyConfig();
  if (!config.isActive) return 0;

  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $inc: { loyaltyPoints: -pointsToRedeem } },
    { new: true, session },
  );

  await createLoyaltyTransaction(
    {
      user: userId,
      booking: bookingId,
      type: loyaltyTransactionTypes.REDEEMED,
      points: -pointsToRedeem,
      balanceAfter: user.loyaltyPoints,
      description: `Redeemed on booking`,
    },
    session,
  );

  return pointsToRedeem;
}

// ─── Refund Points (called on cancellation) ────────────────

export async function refundPointsService(userId, bookingId, pointsToRefund, session) {
  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $inc: { loyaltyPoints: pointsToRefund } },
    { new: true, session },
  );

  await createLoyaltyTransaction(
    {
      user: userId,
      booking: bookingId,
      type: loyaltyTransactionTypes.REFUNDED,
      points: pointsToRefund,
      balanceAfter: user.loyaltyPoints,
      description: `Refunded from cancelled booking`,
    },
    session,
  );

  return pointsToRefund;
}

// ─── Admin: Manual Adjustment ──────────────────────────────

export async function adjustPointsService(body, adminUser, lang) {
  const { userId, points, reason } = body;

  const user = await UserModel.findById(userId);
  if (!user) {
    throw new ApiError(t("loyalty.USER_NOT_FOUND", lang), 404);
  }

  // Prevent negative balance
  if (user.loyaltyPoints + points < 0) {
    throw new ApiError(t("loyalty.INSUFFICIENT_POINTS", lang), 400);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const updated = await UserModel.findByIdAndUpdate(
      userId,
      { $inc: { loyaltyPoints: points } },
      { new: true, session },
    );

    await createLoyaltyTransaction(
      {
        user: userId,
        type: loyaltyTransactionTypes.ADJUSTED,
        points,
        balanceAfter: updated.loyaltyPoints,
        description: reason || `Manual adjustment by admin`,
        createdBy: adminUser._id,
      },
      session,
    );

    await session.commitTransaction();

    return { userId, newBalance: updated.loyaltyPoints, pointsAdjusted: points };
  } catch (err) {
    if (session.inTransaction()) await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

// ─── Admin: View any user's history ────────────────────────

export async function getUserLoyaltyService(userId, queryParams, lang) {
  const user = await UserModel.findById(userId).select("loyaltyPoints firstName lastName").lean();
  if (!user) {
    throw new ApiError(t("loyalty.USER_NOT_FOUND", lang), 404);
  }

  const { page, limit } = queryParams;
  const totalCount = await countTransactionsByUser(userId);
  const { pageNum, limitNum, skip } = buildPagination({ page, limit }, 10);

  const transactions = await findTransactionsByUser(userId, {
    skip,
    limit: limitNum,
    populate: { path: "booking", select: "bookingNumber" },
  });

  return {
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      balance: user.loyaltyPoints,
    },
    totalPages: Math.ceil(totalCount / limitNum) || 1,
    page: pageNum,
    results: transactions.length,
    transactions,
  };
}
