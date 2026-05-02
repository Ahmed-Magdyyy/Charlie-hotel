import mongoose from "mongoose";

const tierDefinitionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    discountRate: {
      type: Number,
      required: true,
      min: 0,
      max: 1, // 0.10 = 10%, 0.15 = 15%
    },
    minSpent: {
      type: Number,
      required: true,
      min: 0, // Spending threshold to reach this tier (SAR)
    },
  },
  { _id: false },
);

const tierConfigSchema = new mongoose.Schema(
  {
    isActive: {
      type: Boolean,
      default: true,
    },
    tiers: {
      type: [tierDefinitionSchema],
      required: true,
      default: [
        { name: "premier", discountRate: 0.10, minSpent: 0 },
        { name: "silver", discountRate: 0.10, minSpent: 3000 },
        { name: "gold", discountRate: 0.15, minSpent: 8000 },
      ],
    },
  },
  { timestamps: true },
);

export const TierConfigModel = mongoose.model("TierConfig", tierConfigSchema);
