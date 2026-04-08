import { LoyaltyTransactionModel } from "./loyaltyTransaction.model.js";
import { LoyaltyConfigModel } from "./loyaltyConfig.model.js";

// ─── Config ────────────────────────────────────────────────

export async function getLoyaltyConfig() {
  let config = await LoyaltyConfigModel.findOne().lean();
  if (!config) {
    config = await LoyaltyConfigModel.create({});
    return config.toObject();
  }
  return config;
}

export async function updateLoyaltyConfig(update) {
  return LoyaltyConfigModel.findOneAndUpdate({}, { $set: update }, {
    returnDocument: "after",
    upsert: true,
    lean: true,
  });
}

// ─── Transactions ──────────────────────────────────────────

export async function createLoyaltyTransaction(data, session) {
  if (session) {
    const [tx] = await LoyaltyTransactionModel.create([data], { session });
    return tx;
  }
  return LoyaltyTransactionModel.create(data);
}

export async function findTransactionsByUser(userId, options = {}) {
  let query = LoyaltyTransactionModel.find({ user: userId }).sort({
    createdAt: -1,
  });
  if (options.skip) query = query.skip(options.skip);
  if (options.limit) query = query.limit(options.limit);
  if (options.populate) query = query.populate(options.populate);
  if (options.lean !== false) query = query.lean();
  return query;
}

export async function countTransactionsByUser(userId) {
  return LoyaltyTransactionModel.countDocuments({ user: userId });
}

export async function findTransactionsByBooking(bookingId) {
  return LoyaltyTransactionModel.find({ booking: bookingId }).lean();
}
