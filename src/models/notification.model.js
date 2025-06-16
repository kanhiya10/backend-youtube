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
    topics: [
      {
        type: String, // e.g., "news", "offers"
      }
    ],
    platform: {
      type: String,
      enum: ['web', 'android', 'ios'],
      default: 'web',
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true, // You can set to false when user logs out or token is invalidated
    }
  },
  { timestamps: true }
);

export const FcmToken = mongoose.model("FcmToken", fcmTokenSchema);
