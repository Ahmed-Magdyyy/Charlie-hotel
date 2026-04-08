import mongoose from "mongoose";

const loyaltyConfigSchema = new mongoose.Schema(
  {
    earnRate: {
      type: Number,
      required: true,
      default: 1, // points per SAR spent
    },
    redeemRate: {
      type: Number,
      required: true,
      default: 0.1, // SAR value per point
    },
    minRedeemPoints: {
      type: Number,
      required: true,
      default: 100,
    },
    expiryMonths: {
      type: Number,
      required: true,
      default: 0, // 0 = never expire
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export const LoyaltyConfigModel = mongoose.model(
  "LoyaltyConfig",
  loyaltyConfigSchema,
);
