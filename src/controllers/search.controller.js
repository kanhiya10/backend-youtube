// controllers/searchController.ts
import {asyncHandler} from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";

export const searchAll = asyncHandler(async (req, res) => {
  const query = req.query.q?.toString().trim();

  if (!query) {
    return res.status(400).json({ message: "Query is required" });
  }

  const userResults = await User.find({
    $or: [
      { username: new RegExp(query, "i") },
      { fullName: new RegExp(query, "i") },
    ],
  }).select("username fullName avatar");

  const videoResults = await Video.find({
    $or: [
      { title: new RegExp(query, "i") },
      { description: new RegExp(query, "i") },
    ],
  }).select("title thumbnail createdAt");

  res.json({
    creators: userResults,
    videos: videoResults,
  });
});
