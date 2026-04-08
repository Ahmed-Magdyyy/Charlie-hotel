import mongoose from "mongoose";

export const loyaltyTransactionTypes = Object.freeze({
  EARNED: "earned",
  REDEEMED: "redeemed",
  REFUNDED: "refunded",
  EXPIRED: "expired",
  ADJUSTED: "adjusted",
});

const loyaltyTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
    type: {
      type: String,
      enum: Object.values(loyaltyTransactionTypes),
      required: true,
    },
    points: {
      type: Number,
      required: true, // positive = credit, negative = debit
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

loyaltyTransactionSchema.index({ user: 1, createdAt: -1 });
loyaltyTransactionSchema.index({ booking: 1 });

export const LoyaltyTransactionModel = mongoose.model(
  "LoyaltyTransaction",
  loyaltyTransactionSchema,
);
