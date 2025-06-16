// models/Comment.ts
import mongoose, { Schema } from "mongoose";

const commentSchema = new Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
      required: true,
    },
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      }
    ],
    dislikes: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      }
    ],
    replies: [
      {
        type: Schema.Types.ObjectId,
        ref: "Comment",
      }
    ],
    parentComment: {
  type: Schema.Types.ObjectId,
  ref: "Comment",
  default: null,
}

  },
  { timestamps: true }
);

export const Comment = mongoose.model("Comment", commentSchema);
