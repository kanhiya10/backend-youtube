// controllers/searchController.ts
import {asyncHandler} from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";

export const searchAll = asyncHandler(async (req, res) => {
  const query = req.query.q?.toString().trim();
  const loggedInUserId = req.user?._id; // available if verifyUserOptional is used

  if (!query) {
    return res.status(400).json({ message: "Query is required" });
  }

  // ---- Search Users ----
  const userResults = await User.find(
    { $text: { $search: query } },
    { score: { $meta: "textScore" } }
  )
    .select("username fullName avatar")
    .sort({ score: { $meta: "textScore" } });

  // Attach subscribers info
  const creatorsWithSubs = await Promise.all(
    userResults.map(async (user) => {
      const subscribersCount = await Subscription.countDocuments({ channel: user._id });

      let isSubscribed = false;
      if (loggedInUserId) {
        isSubscribed = await Subscription.exists({
          subscriber: loggedInUserId,
          channel: user._id,
        });
      }

      return {
        ...user.toObject(),
        subscribersCount,
        isSubscribed: Boolean(isSubscribed),
      };
    })
  );

  // ---- Search Videos ----
  const videoResults = await Video.find(
    { $text: { $search: query } },
    { score: { $meta: "textScore" } }
  )
    .select("title thumbnail duration views createdAt")
    .sort({ score: { $meta: "textScore" } });

  res.json({
    creators: creatorsWithSubs,
    videos: videoResults,
  });
});



export const searchUsers = asyncHandler(async (req, res) => {
  const query = req.query.query?.toString().trim();
  console.log("Search users endpoint hit", query);

  if (!query) {
    return res.status(400).json({ message: "Query is required" });
  }

  const users = await User.find({
    $or: [
      { username: new RegExp(query, "i") },
      { fullName: new RegExp(query, "i") },
    ],
  })
    .select("username fullName avatar")
    .limit(20);

    console.log("Users found:", users.length);

  res.json(users);
});
