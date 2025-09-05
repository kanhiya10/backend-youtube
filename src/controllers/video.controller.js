import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js";
import { RemoveFromCloudinary, UploadOnCloudinary, uploadHLSFolderToCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from 'fs';
import { exec } from 'child_process';
import { stderr, stdout } from "process";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import util from 'util';
import { sendNotification } from "../utils/videoUploadNotification.js";
import { Subscription } from "../models/subscription.model.js";
import { Notification } from "../models/notificationEntries.model.js";
import { getSubscriptionDetails } from "../utils/subscriptionHelpers.js";

const execPromise = util.promisify(exec);

async function getVideoDuration(filePath) {
  try {
    const { stdout } = await execPromise(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`);
    return parseFloat(stdout.trim());
  } catch (err) {
    console.error('Error getting video duration:', err);
    return null;
  }
}

const uploadVideo = asyncHandler(async (req, res) => {
  console.log('upload video fn is working');

  const { title, description, views, isPublished } = req.body;

  if ([title, description, views, isPublished].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const lessonId = uuidv4();

  const videoLocalPath = req.files?.video?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoLocalPath) throw new ApiError(400, "Video file is missing");
  if (!thumbnailLocalPath) throw new ApiError(400, "Thumbnail file is missing");

  const outputPath = `./public/temp/course/${lessonId}`;
  const hlsPath = `${outputPath}/index.m3u8`;

  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  const ffmpegCommand = `ffmpeg -i "${videoLocalPath}" -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputPath}/segment%03d.ts" -start_number 0 "${hlsPath}"`;

  exec(ffmpegCommand, async (error, stdout, stderr) => {
    try {
      if (error) {
        console.error(`FFmpeg error: ${error}`);
        fs.unlinkSync(videoLocalPath);
        fs.unlinkSync(thumbnailLocalPath);
        return res.status(500).json({ error: "Error during video processing" });
      }

      const uploadedUrls = await uploadHLSFolderToCloudinary(outputPath, lessonId);

      if (fs.existsSync(outputPath)) {
        fs.rmSync(outputPath, { recursive: true, force: true });
      }


      // videoUrl will be the m3u8 file's Cloudinary URL
      const videoUrl = uploadedUrls.find(url => url.endsWith(".m3u8"));


      // const videoUrl = `https://backend-youtube-zba1.onrender.com/uploads/course/${lessonId}/index.m3u8`;

      const thumbnailUpload = await UploadOnCloudinary(thumbnailLocalPath, [
        { width: 480, height: 270, crop: 'fill', gravity: 'auto' }
      ]);

      if (!thumbnailUpload?.url) {
        if (fs.existsSync(videoLocalPath)) {
          fs.unlinkSync(videoLocalPath);
        }
        if (fs.existsSync(thumbnailLocalPath)) {
          fs.unlinkSync(thumbnailLocalPath);
        }

        return res.status(400).json({ error: "Failed to upload thumbnail to Cloudinary" });
      }

      const duration = await getVideoDuration(videoLocalPath);

      const video = await Video.create({
        title,
        description,
        videoFile: videoUrl,
        thumbnail: thumbnailUpload.url,
        duration,
        views,
        isPublished,
        owner: req.user?._id,
      });

      console.log('Video instance created in DB');

      const subscriptions = await Subscription.find({ channel: req.user._id }).select('subscriber');

      if (!subscriptions || subscriptions.length === 0) {
        console.log('No subscriptions found for this user');
      } else {
        console.log('Subscriptions found:', subscriptions);

        const payload = {
          title: 'New Video Uploaded!',
          body: `Watch now.`,
          videoId: video._id.toString(),
          creatorId: req.user._id.toString(),
          thumbnail: video.thumbnail,

        };

        const dbNotifications = subscriptions.map((sub) => ({
          user: sub.subscriber,           // Receiver of the notification
          actor: req.user._id,            // Creator/uploader
          type: 'videoUpload',
          title: 'New Video Uploaded!',
          body: `${title} is now live.`,
          data: payload,
          isRead: false,
          createdAt: new Date(),

        }));

        if (dbNotifications.length) {
          await Notification.insertMany(dbNotifications);
        }
        console.log('saved notifications in DB');
      }

      await sendNotification(
        req.user._id,
        payload.title,
        payload.body,
        payload
      );


      if (fs.existsSync(videoLocalPath)) {
        fs.unlinkSync(videoLocalPath);
      }
      if (fs.existsSync(thumbnailLocalPath)) {
        fs.unlinkSync(thumbnailLocalPath);
      }


      return res.status(201).json({
        message: "Video uploaded and processed successfully",
        video,
      });
    } catch (err) {
      console.error("Unexpected error:", err);
      // Cleanup in case of unexpected error
      if (fs.existsSync(videoLocalPath)) fs.unlinkSync(videoLocalPath);
      if (fs.existsSync(thumbnailLocalPath)) fs.unlinkSync(thumbnailLocalPath);
      return res.status(500).json({ error: "Unexpected error during upload" });
    }
  });
});



// const handleGetVideos=asyncHandler(async(req,res)=>{
//     const {id}=req.params;
//     try{
//         const AllVideos=await Video.find({owner:new mongoose.Types.ObjectId(id)});
//         console.log("Users video collection :",AllVideos);

//         return res.status(200).json(new ApiResponse(200,AllVideos,"video fetching successfull"));
//     }
//     catch(error){
//         console.error(error);
//     }
// })

const getVideosByUsername = asyncHandler(async (req, res) => {
  let userId;

  // If the request has an authenticated user, use their ID
  if (req.user) {
    userId = req.user._id;
  }
  // If a username is provided in the route params, find the user by username
  else if (req.params.username) {
    const user = await User.findOne({ username: req.params.username });
    if (!user) throw new ApiError(404, "User not found");
    userId = user._id;
  }
  // If neither an authenticated user nor a username is available, return an error
  else {
    throw new ApiError(400, "Username is required or user must be logged in");
  }

  console.log("Fetching videos for userId:", userId);

  // Fetch videos belonging to the resolved user ID
  const videos = await Video.find({ owner: userId }).sort({ createdAt: -1 });

  res.json(new ApiResponse(200, videos, "Videos fetched successfully"));
});



const randomVideos = asyncHandler(async (req, res) => {

  console.log(' random videos fn is working ')

  try {
    const randomVideos = await Video.aggregate([
      { $sample: { size: 10 } },
      {
        $project: {
          _id: 1,
          title: 1,
          videoFile: 1,
          thumbnail: 1,
          createdAt: 1,
          views: 1,
          duration: 1,
        },
      },

    ]);//to randomly fetch videos

    return res.status(200).json(new ApiResponse(200, randomVideos, "random videos fetched successfully"))
  }
  catch (error) {
    console.error('Error fetching random videos:', err);
    res.status(500).json(new ApiError(500, "random videos not fetched "));
  }

})

const videoOwnerInfo = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const video = await Video.findById(id)
      .select(' videoFile thumbnail title views description owner ')
      .populate({
        path: "owner",
        select: " username fullName avatar coverImage ", // pick only required fields from User
      })
      .populate('likedBy', '_id')    // only populate _id (you could also populate username if needed)
      .populate('dislikedBy', '_id')


    if (!video) {
      return res.status(404).json(new ApiError(404, "Video not found"));
    }

    const likesCount = video.likedBy?.length || 0;
    const dislikesCount = video.dislikedBy?.length || 0;

    const { subscribersCount, isSubscribed } = await getSubscriptionDetails(
      video.owner._id,
      req.user?._id || null
    );

    return res.status(200).json(
      new ApiResponse(200,
        {
          video: {
            _id: video._id,
            title: video.title,
            thumbnail: video.thumbnail,
            views: video.views,
            videoFile: video.videoFile,
            description: video.description,
            owner: video.owner,
          },
          likes: likesCount,
          dislikes: dislikesCount,
          isSubscribed,
          subscribersCount,
        },
        "Video owner info fetched successfully"
      )
    );

  } catch (error) {
    console.error('Error fetching video owner info:', error);
    res.status(500).json(new ApiError(500, "Video owner info not fetched"));
  }
});



const toggleReaction = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { reaction } = req.body; // 'like' or 'dislike'
  const userId = req.user._id;

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (reaction === 'like') {
    const hasLiked = video.likedBy.includes(userId);
    if (hasLiked) {
      video.likedBy.pull(userId);
    } else {
      video.likedBy.push(userId);
      video.dislikedBy.pull(userId); // remove dislike if any
    }
  } else if (reaction === 'dislike') {
    const hasDisliked = video.dislikedBy.includes(userId);
    if (hasDisliked) {
      video.dislikedBy.pull(userId);
    } else {
      video.dislikedBy.push(userId);
      video.likedBy.pull(userId); // remove like if any
    }
  } else {
    throw new ApiError(400, "Invalid reaction type");
  }

  await video.save();

  res.status(200).json({
    success: true,
    data: {
      likes: video.likedBy.length,
      dislikes: video.dislikedBy.length,
      likedByUser: video.likedBy.includes(userId),
      dislikedByUser: video.dislikedBy.includes(userId),
    },
  });
});


const getSingleVideoById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const video = await Video.findById(id);
  if (!video) throw new ApiError(404, "Video not found");
  res.status(200).json(new ApiResponse(200, video, "Video fetched successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json(new ApiError(404, "Video not found"));
    }

    if (video.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json(new ApiError(403, "You are not authorized to delete this video"));
    }

    console.log("Deleting video:", video);

    // Delete from Cloudinary
    await RemoveFromCloudinary(video.videoFile);
    await RemoveFromCloudinary(video.thumbnail);

    console.log("Deleted from Cloudinary");
    // Delete related comments
    await Comment.deleteMany({ video: id });

    // Remove from users’ watch history
    await User.updateMany(
      { watchHistory: id },
      { $pull: { watchHistory: id } }
    );

    // Delete the video itself
    await Video.findByIdAndDelete(id);

    return res.status(200).json(new ApiResponse(200, null, "Video deleted successfully"));
  } catch (error) {
    console.error(error);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  }
});







export { uploadVideo, getVideosByUsername, randomVideos, videoOwnerInfo, toggleReaction, getSingleVideoById, deleteVideo }





