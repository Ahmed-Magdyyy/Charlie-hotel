import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { accountStatus, roles } from "../../shared/constants/enums.js";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      required: [true, "Email is required"],
      index: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      unique: true,
      required: [true, "Phone is required"],
      sparse: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(roles),
      default: roles.GUEST,
    },
    position: {
      type: String,
      trim: true,
    },
    permissions: {
      type: Map,
      of: new mongoose.Schema(
        {
          read: { type: Boolean, default: false },
          create: { type: Boolean, default: false },
          edit: { type: Boolean, default: false },
          delete: { type: Boolean, default: false },
        },
        { _id: false },
      ),
      default: {},
    },
    loyaltyPoints: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    preferredLanguage: {
      type: String,
      enum: ["en", "ar"],
      default: "en",
    },
    account_status: {
      type: String,
      enum: Object.values(accountStatus),
      default: accountStatus.PENDING,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationCode: String,
    emailVerificationExpires: Date,
    emailOtpLastSentAt: Date,
    emailOtpSendCountToday: {
      type: Number,
      default: 0,
    },
    // Reset password
    passwordResetCode: String,
    passwordResetCodeExpire: Date,
    passwordResetCodeVerified: Boolean,
    passwordChangedAT: Date,

    refreshTokens: [
      {
        token: String,
        expiresAt: Date,
      },
    ],
  },
  { timestamps: true },
);

userSchema.pre("save", async function () {
  if (!this.isModified("passwordHash")) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

export const UserModel = mongoose.model("User", userSchema);
