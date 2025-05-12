import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js";
import { RemoveFromCloudinary, UploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from 'fs';
import {exec} from 'child_process';
import {stderr,stdout} from "process";
import { User } from "../models/user.model.js";



const uploadVideo=asyncHandler(async(req,res)=>{

  console.log('upload video fn is working');

    const{title,description,views,isPublished}=req.body;

    if(
        [title,description,views,isPublished].some((field)=>field?.trim()==="")
    ){
        throw new ApiError(400,"All fields are required")
    }
    

    const lessonId=uuidv4();

    const videoLocalPath=req.files?.video[0].path;

    const thumbnailLocalPath=req.files?.thumbnail[0].path;

    if(!videoLocalPath){
        throw new ApiError(400,"Video file is missing");
    }

    if(!thumbnailLocalPath){
        throw new ApiError(400,"thumbnail file is missing");
    }

    const outputPath=`./public/temp/course/${lessonId}}`;
    const hlsPath=`${outputPath}/index.m3u8`

    console.log('hlsPath',hlsPath);

    if(!fs.existsSync(outputPath)){
        fs.mkdirSync(outputPath,{recursive:true});
    }


    const ffmpegCommand = `ffmpeg -i ${videoLocalPath} -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type 
    vod -hls_segment_filename "${outputPath}/segment%03d.ts" -start_number 0 ${hlsPath}`;

    exec(ffmpegCommand, (error, stdout, stderr) => {
    if (error) {
      console.log(`exec error: ${error}`)
    }
    console.log(`stdout: ${stdout}`)
    console.log(`stderr: ${stderr}`)
    const videoUrl = `https://backend-youtube-zba1.onrender.com/uploads/courses/${lessonId}/index.m3u8`;
})



   

    // const videoUpload=await UploadOnCloudinary();

    // const thumbnailUpload=await UploadOnCloudinary(thumbnailLocalPath);

    // if(!videoUpload.url){
    //     throw new ApiError(400,"Error while uploading video on cloudinary")
    // }

    // if(!thumbnailUpload.url){
    //     throw new ApiError(400,"Error while uploading thumbnail on cloudinary")
    // }

    // console.log('videoUpload',videoUpload);
    // console.log('thumbnailUpload',thumbnailUpload);

    const video=await Video.create({
        title,
        description,
        videoFile:videoUpload.url,
        thumbnail:thumbnailUpload.url,
        duration:videoUpload.duration,
        views,
        isPublished,
        owner:req.user?._id

    })

    console.log('instance created');



    
})

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



const randomVideos=asyncHandler(async(req,res)=>{

    console.log(' random videos fn is working ')

    try{
        const randomVideos = await Video.aggregate([{ $sample: { size: 5 } }]);//to randomly fetch videos

        return res.status(200).json(new ApiResponse(200,randomVideos,"random videos fetched successfully"))
    }
    catch(error){
        console.error('Error fetching random videos:', err);
    res.status(500).json(new ApiError(500,"random videos not fetched "));
    }

})

const videoOwnerInfo = asyncHandler(async (req, res) => {
    const { id } = req.params;
  
    try {
      const video = await Video.findById(id).populate('owner', '-password'); // populate user data
  
      if (!video) {
        return res.status(404).json(new ApiError(404, "Video not found"));
      }
  
      return res
        .status(200)
        .json(new ApiResponse(200, video.owner, "Video owner info fetched successfully"));
    } catch (error) {
      console.error('Error fetching video owner info:', error);
      res
        .status(500)
        .json(new ApiError(500, "Video owner info not fetched"));
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
  
  

   

export {uploadVideo,getVideosByUsername,randomVideos,videoOwnerInfo,toggleReaction}








// import { asyncHandler } from "../utils/asyncHandler.js";
// import { ApiError } from "../utils/ApiError.js";
// import { ApiResponse } from "../utils/ApiResponse.js";
// import { Video } from "../models/video.model.js";
// import { RemoveFromCloudinary, UploadOnCloudinary } from "../utils/cloudinary.js";
// import jwt from "jsonwebtoken";
// import mongoose from "mongoose";
// import { v4 as uuidv4 } from "uuid";
// import path from "path";
// import fs from 'fs';
// import { exec } from 'child_process';
// import { stderr, stdout } from "process";

// const uploadVideo = asyncHandler(async (req, res) => {
//   const { title, description, views, isPublished } = req.body;

//   // Validate required fields
//   if ([title, description, views, isPublished].some((field) => field?.trim() === "")) {
//     throw new ApiError(400, "All fields are required");
//   }

//   const lessonId = uuidv4(); // Unique ID for the lesson
//   const videoLocalPath = req.files?.video[0].path;
//   const thumbnailLocalPath = req.files?.thumbnail[0].path;

//   // Validate files
//   if (!videoLocalPath) {
//     throw new ApiError(400, "Video file is missing");
//   }

//   if (!thumbnailLocalPath) {
//     throw new ApiError(400, "Thumbnail file is missing");
//   }

//   // Create output path for HLS video conversion
//   const outputPath = `./public/temp/course/${lessonId}`;
//   const hlsPath = `${outputPath}/index.m3u8`;

//   // Make sure the directory exists
//   if (!fs.existsSync(outputPath)) {
//     fs.mkdirSync(outputPath, { recursive: true });
//   }

//   const ffmpegCommand = `ffmpeg -i ${videoLocalPath} -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputPath}/segment%03d.ts" -start_number 0 ${hlsPath}`;

//   exec(ffmpegCommand, async (error, stdout, stderr) => {
//     if (error) {
//       console.log(`exec error: ${error}`);
//       throw new ApiError(500, "Error during video processing");
//     }

//     console.log(`stdout: ${stdout}`);
//     console.log(`stderr: ${stderr}`);

//     // Now upload to Cloudinary
//     try {
//       const videoUpload = await UploadOnCloudinary(hlsPath); // Upload the HLS video file
//       const thumbnailUpload = await UploadOnCloudinary(thumbnailLocalPath); // Upload the thumbnail

//       // Check upload success
//       if (!videoUpload.url) {
//         throw new ApiError(400, "Error while uploading video to Cloudinary");
//       }

//       if (!thumbnailUpload.url) {
//         throw new ApiError(400, "Error while uploading thumbnail to Cloudinary");
//       }

//       // Save video information in the database
//       const video = await Video.create({
//         title,
//         description,
//         videoFile: videoUpload.url,
//         thumbnail: thumbnailUpload.url,
//         duration: videoUpload.duration,
//         views,
//         isPublished,
//         owner: req.user?._id,
//       });

//       console.log('Video instance created');
//       return res.status(200).json(new ApiResponse(200, video, "Video uploaded successfully"));
//     } catch (uploadError) {
//       console.error("Error uploading to Cloudinary:", uploadError);
//       throw new ApiError(500, "Error uploading video or thumbnail to Cloudinary");
//     } finally {
//       // Clean up temporary files
//       fs.rmSync(outputPath, { recursive: true, force: true });
//     }
//   });
// });

// const handleGetVideos = asyncHandler(async (req, res) => {
//   const { id } = req.params;
//   try {
//     const allVideos = await Video.find({ owner: new mongoose.Types.ObjectId(id) });
//     console.log("User's video collection:", allVideos);
//     return res.status(200).json(new ApiResponse(200, allVideos, "Video fetching successful"));
//   } catch (error) {
//     console.error("Error fetching videos:", error);
//     return res.status(500).json(new ApiError(500, "Error fetching videos"));
//   }
// });

// const randomVideos = asyncHandler(async (req, res) => {
//   console.log('Random videos function is working');

//   try {
//     const randomVideos = await Video.aggregate([{ $sample: { size: 5 } }]); // Randomly fetch 5 videos
//     return res.status(200).json(new ApiResponse(200, randomVideos, "Random videos fetched successfully"));
//   } catch (error) {
//     console.error('Error fetching random videos:', error);
//     return res.status(500).json(new ApiError(500, "Error fetching random videos"));
//   }
// });

// export { uploadVideo, handleGetVideos, randomVideos };
