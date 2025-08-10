// backend-youtube/src/models/conversation.js
import mongoose, { Schema } from "mongoose";

const conversationSchema = new Schema(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: "User" }],
    lastMessage: { type: Schema.Types.ObjectId, ref: "Message" }, // optional
  },
  { timestamps: true }
);

export const Conversation = mongoose.model("Conversation", conversationSchema);