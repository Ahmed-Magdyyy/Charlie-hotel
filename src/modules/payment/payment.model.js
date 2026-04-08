import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "SAR",
    },
    method: {
      type: String,
      enum: ["credit_card", "mada", "apple_pay", "stc_pay", "pay_at_hotel", "offline"],
      required: true,
    },
    gateway: {
      type: String,
      enum: ["moyasar", "tap", "hyperpay", "offline"],
      required: true,
    },
    gatewayPaymentId: {
      type: String,
      default: null,
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    status: {
      type: String,
      enum: ["initiated", "paid", "failed", "refunded"],
      default: "initiated",
    },
    refundId: {
      type: String,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

paymentSchema.index({ booking: 1 });
paymentSchema.index({ gatewayPaymentId: 1 });
paymentSchema.index({ status: 1 });

export const PaymentModel = mongoose.model("Payment", paymentSchema);
