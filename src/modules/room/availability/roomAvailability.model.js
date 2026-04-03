import mongoose from "mongoose";

const roomAvailabilitySchema = new mongoose.Schema(
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
    bookedRooms: {
      type: Number,
      default: 0,
      min: 0,
    },
    blockedRooms: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

roomAvailabilitySchema.index({ roomType: 1, date: 1 }, { unique: true });

export const RoomAvailabilityModel = mongoose.model(
  "RoomAvailability",
  roomAvailabilitySchema,
);
