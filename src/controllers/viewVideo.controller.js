import { VideoView } from "../models/viewVideo.model.js";
import { Video } from "../models/video.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

const viewVideo = asyncHandler(async (req, res) => {
  const videoId = req.params.videoId;
  
  // Track anonymous views via IP address
  const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  
  // Record the view
  await VideoView.create({
    video: videoId,
    ipAddress,
  });

  // Increment the views count in the Video model
  await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });

  res.status(200).json({ message: "View recorded" });
});

export default viewVideo;
