import mongoose from "mongoose";
import {
  bookingStatus,
  bookingPaymentStatus,
  reservationOptionTypes,
  cancellationPolicyTypes,
  paymentOptionTypes,
} from "../../shared/constants/enums.js";

// ─── Sub-schemas ────────────────────────────────────────────

const guestDetailsSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    nationality: { type: String, trim: true },
  },
  { _id: false },
);

const selectedOptionSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    priceModifier: { type: Number, required: true },
  },
  { _id: false },
);

const nightlyRateSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    basePrice: { type: Number, required: true },
    modifiers: {
      reservation: { type: Number, required: true },
      cancellation: { type: Number, required: true },
      payment: { type: Number, required: true },
    },
    total: { type: Number, required: true },
  },
  { _id: false },
);

const priceBreakdownSchema = new mongoose.Schema(
  {
    nightlyRates: [nightlyRateSchema],
    subtotal: { type: Number, required: true },
    loyaltyDiscount: { type: Number, default: 0 },
    taxableAmount: { type: Number, required: true },
    munTaxRate: { type: Number, default: 0 },
    munTax: { type: Number, default: 0 },
    vatRate: { type: Number, required: true },
    vatAmount: { type: Number, required: true },
    taxes: { type: Number, required: true },
    grandTotal: { type: Number, required: true },
    tierName: { type: String, default: "premier" },
    tierDiscountRate: { type: Number, default: 0 },
    tierDiscount: { type: Number, default: 0 },
    finalTotal: { type: Number, required: true },
  },
  { _id: false },
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    changedAt: { type: Date, default: Date.now },
    note: { type: String, trim: true },
  },
  { _id: false },
);

// ─── Main Schema ────────────────────────────────────────────

const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      unique: true,
      required: true,
    },

    // Who
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    guestDetails: {
      type: guestDetailsSchema,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // What
    roomType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RoomType",
      required: true,
    },
    guests: {
      type: Number,
      required: true,
      min: 1,
    },
    checkIn: {
      type: Date,
      required: true,
    },
    checkOut: {
      type: Date,
      required: true,
    },
    nights: {
      type: Number,
      required: true,
      min: 1,
    },

    // Selected options (snapshot at booking time)
    reservationOption: {
      type: selectedOptionSchema,
      required: true,
    },
    cancellationPolicy: {
      type: selectedOptionSchema,
      required: true,
    },
    paymentOption: {
      type: selectedOptionSchema,
      required: true,
    },

    // Price (immutable snapshot)
    priceBreakdown: {
      type: priceBreakdownSchema,
      required: true,
    },

    // Status
    status: {
      type: String,
      enum: Object.values(bookingStatus),
      default: bookingStatus.PENDING,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(bookingPaymentStatus),
      default: bookingPaymentStatus.PENDING,
    },
    statusHistory: [statusHistorySchema],

    // Payment
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },

    // Loyalty
    loyaltyPointsRedeemed: {
      type: Number,
      default: 0,
      min: 0,
    },
    loyaltyPointsEarned: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Metadata
    specialRequests: {
      type: String,
      trim: true,
    },
    isManualBooking: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// ─── Indexes ────────────────────────────────────────────────

// bookingNumber index already created by unique: true on the field
bookingSchema.index({ client: 1, createdAt: -1 });
bookingSchema.index({ roomType: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ status: 1, expiresAt: 1 }); // for expiry job
bookingSchema.index({ createdAt: -1 });

export const BookingModel = mongoose.model("Booking", bookingSchema);
