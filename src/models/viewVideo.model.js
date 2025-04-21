import mongoose, { Schema } from "mongoose";

const videoViewSchema = new Schema(
  {
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
      required: true,
    },
    ipAddress: {
      type: String, 
      required: false, // IP is optional for anonymous users
    },
  },
  { timestamps: true }
);

export const VideoView = mongoose.model("VideoView", videoViewSchema);
