import mongoose, { Schema } from "mongoose";

const fcmTokenSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true, // One FCM token per document
    },
    platform: {
      type: String,
      enum: ['web', 'android', 'ios'],
      default: 'web',
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    }
  },
  { timestamps: true }
);

export const FcmToken = mongoose.model("FcmToken", fcmTokenSchema);
