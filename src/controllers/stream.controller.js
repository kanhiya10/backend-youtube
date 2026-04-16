import Stream from "../models/stream.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {User} from "../models/user.model.js";

// Example stream key generator
const generateUniqueStreamKey = () => {
  return Math.random().toString(36).substring(2, 12);
};

const startStream = asyncHandler(async (req, res) => {
  const { title, category } = req.body;
  const userId = req.user._id;

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  if (!user.streamKey) {
  user.streamKey = generateUniqueStreamKey();
  await user.save();
}


  const streamKey = user.streamKey; // ✅ Reuse the same key

  const stream = await Stream.create({
    userId,
    streamKey,
    title,
    category,
    isLive: true,
    startedAt: new Date(),
  });

  res.status(200).json(new ApiResponse(200, { streamKey }, "Stream started successfully"));
});



const getStreamByUsername = asyncHandler(async (req, res) => {
    const { username } = req.params;
  
    // Find the user by username
    const user = await User.findOne({ username });
    if (!user) throw new ApiError(404, "User not found");
  
    // Find their stream
    const stream = await Stream.findOne({ userId: user._id });
  
    // If no stream or not live, return that info
    if (!stream || !stream.isLive) {
      return res.json(new ApiResponse(200, { isLive: false }, "User is not live"));
    }
  
    // Return stream info
    return res.json(new ApiResponse(200, {
      streamKey: stream.streamKey,
      isLive: true,
      title: stream.title,
      category: stream.category
    }, "Live stream data"));
  });


  const stopStream = asyncHandler(async (req, res) => {
    const userId = req.user._id;
  
    const stream = await Stream.findOneAndUpdate(
      { userId, isLive: true },
      {
        isLive: false,
        endedAt: new Date(),
      },
      { new: true }
    );
  
    if (!stream) throw new ApiError(404, "No active stream found");
  
    res
      .status(200)
      .json(new ApiResponse(200, { stream }, "Stream stopped successfully"));
  });


  const getPastStreamsByUsername = asyncHandler(async (req, res) => {
    let userId;
    if (req.user) {
      userId = req.user._id;
    } else if (req.params.username) {
      const user = await User.findOne({ username: req.params.username });
      if (!user) throw new ApiError(404, "User not found");
      userId = user._id;
    } else {
      throw new ApiError(400, "Username is required or user must be logged in");
    }


    const pastStreams = await Stream.find({
      userId: userId,
      isLive: false,
      endedAt: { $ne: null },
    }).sort({ endedAt: -1 });

  
    res.json(new ApiResponse(200, pastStreams, "Past streams fetched"));
  });


//   const regenerateStreamKey = asyncHandler(async (req, res) => {
//   const userId = req.user._id;
//   const newKey = generateUniqueStreamKey();

//   const user = await User.findByIdAndUpdate(userId, { streamKey: newKey }, { new: true });
//   res.status(200).json(new ApiResponse(200, { streamKey: user.streamKey }, "Stream key regenerated"));
// });

  
  
  export { startStream, getStreamByUsername, stopStream, getPastStreamsByUsername };