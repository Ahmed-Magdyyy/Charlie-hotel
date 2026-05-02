import { TierConfigModel } from "./tierConfig.model.js";

// ─── Config ────────────────────────────────────────────────

export async function getTierConfig() {
  let config = await TierConfigModel.findOne().lean();
  if (!config) {
    config = await TierConfigModel.create({});
    return config.toObject();
  }
  return config;
}

export async function updateTierConfig(update) {
  return TierConfigModel.findOneAndUpdate({}, { $set: update }, {
    returnDocument: "after",
    upsert: true,
    lean: true,
  });
}
