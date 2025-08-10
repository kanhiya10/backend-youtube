import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema(
  {
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    from: { type: Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String },

    // ✅ Added fields for media support
    mediaUrl: { type: String }, // optional
    mediaType: { type: String, enum: ["image", "video", "file"] }, // optional

    delivered: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Message = mongoose.model("Message", messageSchema);
