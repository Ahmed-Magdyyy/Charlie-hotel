import mongoose from "mongoose";
import {
  bedTypes,
  roomViews,
  amenities as amenitiesEnum,
  reservationOptionTypes,
  cancellationPolicyTypes,
  paymentOptionTypes,
  smokingPolicies,
  accessibilityFeatures as accessibilityEnum,
} from "../../../shared/constants/enums.js";

// ─── Sub-schemas ────────────────────────────────────────────

const localizedString = {
  en: { type: String, trim: true },
  ar: { type: String, trim: true },
};

const bedSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: Object.values(bedTypes),
      required: true,
    },
    count: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false },
);

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    public_id: { type: String, required: true },
    alt: localizedString,
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

const reservationOptionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: Object.values(reservationOptionTypes),
      required: true,
    },
    priceModifier: { type: Number, default: 0 },
  },
  { _id: false },
);

const cancellationPolicySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: Object.values(cancellationPolicyTypes),
      required: true,
    },
    priceModifier: { type: Number, default: 0 },
  },
  { _id: false },
);

const paymentOptionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: Object.values(paymentOptionTypes),
      required: true,
    },
    priceModifier: { type: Number, default: 0 },
  },
  { _id: false },
);

// ─── Main Schema ────────────────────────────────────────────

const roomTypeSchema = new mongoose.Schema(
  {
    name: {
      en: {
        type: String,
        required: [true, "English name is required"],
        trim: true,
      },
      ar: { type: String, trim: true },
    },
    description: localizedString,
    roomSize: {
      type: Number,
      min: 0,
    },
    maxGuests: {
      type: Number,
      required: [true, "Max guests is required"],
      min: 1,
    },
    basePrice: {
      type: Number,
      required: [true, "Base price is required"],
      min: 0,
    },
    beds: [bedSchema],
    amenities: [
      {
        type: String,
        enum: Object.values(amenitiesEnum),
        trim: true,
      },
    ],
    views: [
      {
        type: String,
        enum: Object.values(roomViews),
      },
    ],
    smokingPolicy: {
      type: String,
      enum: Object.values(smokingPolicies),
      default: smokingPolicies.NON_SMOKING,
    },
    accessibilityFeatures: [
      {
        type: String,
        enum: Object.values(accessibilityEnum),
      },
    ],
    images: [imageSchema],
    reservationOptions: [reservationOptionSchema],
    cancellationPolicies: [cancellationPolicySchema],
    paymentOptions: [paymentOptionSchema],
    totalRoomCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Indexes
roomTypeSchema.index({ "name.en": 1 });
roomTypeSchema.index({ isActive: 1 });

export const RoomTypeModel = mongoose.model("RoomType", roomTypeSchema);
