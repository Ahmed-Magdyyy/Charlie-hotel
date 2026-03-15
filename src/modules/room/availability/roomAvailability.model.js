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
    totalRooms: {
      type: Number,
      required: [true, "Total rooms is required"],
      min: 0,
    },
    bookedRooms: {
      type: Number,
      default: 0,
      min: 0,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

roomAvailabilitySchema.index({ roomType: 1, date: 1 }, { unique: true });

export const RoomAvailabilityModel = mongoose.model(
  "RoomAvailability",
  roomAvailabilitySchema,
);
