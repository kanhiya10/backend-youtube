import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { getCommentWithReplies } from "../utils/fetchReplies.js";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { sendUserNotification } from "../utils/videoUploadNotification.js";
// import { getCommentWithReplies } from "../utils/fetchReplies.js";

export const createComment = asyncHandler(async (req, res, next) => {
  const { text, videoId } = req.body;
  const userId = req.user?._id;

  if (!text || !videoId) {
    return next(new ApiError(400, "Text and videoId are required"));
  }

  const video = await Video.findById(videoId).populate('owner', '_id');

  if (!video) {
    return res.status(404).json({ message: 'Video not found' });
  }


  const comment = await Comment.create({
    text,
    video: videoId,
    user: userId,
  });

  if (!comment) {
    return next(new ApiError(500, "Failed to create comment"));
  }

  if (video.owner._id.toString() !== userId.toString()) {
    sendUserNotification(
      video.owner._id,
      '💬 New Comment on Your Video!',
      `${req.user.name} commented: "${text}"`,
      {
        videoId: video._id.toString(),
        commentId: comment._id.toString(),
        actorId: userId.toString(),
      }
    ).catch(err => console.error("Notification error:", err));
  }


  return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment created successfully"));
});

// export const getCommentsByVideo = asyncHandler(async (req, res, next) => {
//   const videoId = req.params.videoId;

//   if (!videoId) {
//     return next(new ApiError(400, "Video ID is required"));
//   }

//  const comments = await Comment.find({ video: videoId, parentComment: null })
//   .populate("user", "fullName avatar")
//   .populate({
//     path: "replies",
//     populate: {
//       path: "user",
//       select: "fullName avatar",
//     },
//   });



//   return res
//     .status(200)
//     .json(new ApiResponse(200, comments, "Comments fetched successfully"));
// });

export const replyToComment = asyncHandler(async (req, res) => {
  const { text, videoId } = req.body;
  const { parentCommentId } = req.params;
  const userId = req.user._id;

  const reply = await Comment.create({
    text,
    user: userId,
    video: videoId,
    parentComment: parentCommentId,
  });

  await Comment.findByIdAndUpdate(parentCommentId, {
    $push: { replies: reply._id },
  });

  const populatedReply = await Comment.findById(reply._id).populate("user", "fullName avatar");

  res.status(201).json(new ApiResponse(201, populatedReply, "Reply added successfully"));
});


// Toggle Like
export const toggleCommentLike = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  if (!userId) throw new ApiError(401, "User not authenticated");
  const { commentId } = req.params;

  const comment = await Comment.findById(commentId);

  if (!comment) throw new ApiError(404, "Comment not found");

  const liked = comment.likes.includes(userId);
  const disliked = comment.dislikes.includes(userId);

  if (liked) {
    comment.likes.pull(userId);
  } else {
    comment.likes.push(userId);
    if (disliked) comment.dislikes.pull(userId); // remove dislike if liked
  }

  await comment.save();

   if (!liked) {
    const recipients = [comment.user._id.toString()];

    if (
      comment.video &&
      comment.video.owner &&
      comment.video.owner.toString() !== userId.toString()
    ) {
      recipients.push(comment.video.owner.toString());
    }

    await sendUserNotification(
      recipients,
      "New Like on Comment",
      `${req.user.username} liked a comment "`,
      {
        type: "COMMENT_LIKE",
        commentId: comment._id.toString(),
        videoId: comment.video._id.toString(),
      }
    );
  }





  res.status(200).json(new ApiResponse(200, {
    totalLikes: comment.likes.length,
    totalDislikes: comment.dislikes.length,
    liked: comment.likes.includes(userId),
    disliked: comment.dislikes.includes(userId),
  }, "Like status updated"));

});

// Toggle Dislike
export const toggleCommentDislike = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { commentId } = req.params;

  const comment = await Comment.findById(commentId);

  if (!comment) throw new ApiError(404, "Comment not found");

  const liked = comment.likes.includes(userId);
  const disliked = comment.dislikes.includes(userId);

  if (disliked) {
    comment.dislikes.pull(userId);
  } else {
    comment.dislikes.push(userId);
    if (liked) comment.likes.pull(userId); // remove like if disliked
  }

  await comment.save();

  res.status(200).json(new ApiResponse(200, {
    totalLikes: comment.likes.length,
    totalDislikes: comment.dislikes.length,
    disliked: comment.dislikes.includes(userId),
    liked: comment.likes.includes(userId),
  }, "Dislike status updated"));

});


// export const getCommentThread = asyncHandler(async (req, res) => {
//   const { commentId } = req.params;

//   const commentThread = await getCommentWithReplies(commentId);

//   if (!commentThread) {
//     throw new ApiError(404, "Comment not found");
//   }

//   res.status(200).json(new ApiResponse(200, commentThread, "Comment thread fetched"));
// });


export const getCommentsForVideo = asyncHandler(async (req, res) => {
  const videoId = req.params.videoId;
  if (!videoId) {
    throw new ApiError(400, "Video ID is required");
  }
  const rootComments = await Comment.find({
    video: videoId,
    parentComment: null,
  })
    .populate("user", "name")
    .lean();

  const nestedComments = await Promise.all(
    rootComments.map(comment => getCommentWithReplies(comment._id))
  );


  res.status(200).json(new ApiResponse(200, nestedComments, "Comments fetched successfully"));
});