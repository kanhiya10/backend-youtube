// models/topic.model.js
import mongoose, { Schema } from "mongoose";

const topicSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true, // e.g. "sports", "tech-news"
    },
    displayName: {
      type: String,
      required: true, // Friendly name shown in UI e.g. "Sports News"
    },
    description: {
      type: String,
      default: "",
    },
    icon: {
      type: String, // optional, could be a URL for UX in frontend
    },
    subscribers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User", // who subscribed
      }
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User", // admin/creator of topic (optional, useful for future)
    },
    // isPublic: {
    //   type: Boolean,
    //   default: true, // public topics vs private ones
    // }
  },
  { timestamps: true }
);

export const Topic = mongoose.model("Topic", topicSchema);
