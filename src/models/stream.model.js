import mongoose, { Schema } from "mongoose";

const StreamSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  streamKey: { type: String, required: true },
  title: { type: String, required: true },
  category: { type: String, required: true },
  isLive: { type: Boolean, default: false },
  views: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date, default: null },
});

const Stream = mongoose.model("Stream", StreamSchema);

export default Stream;
