import mongoose from "mongoose";

const roomPricingSchema = new mongoose.Schema(
  {
    roomType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RoomType",
      required: [true, "Room type is required"],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: 0,
    },
  },
  { timestamps: true },
);

roomPricingSchema.index({ roomType: 1, date: 1 }, { unique: true });

export const RoomPricingModel = mongoose.model("RoomPricing", roomPricingSchema);
