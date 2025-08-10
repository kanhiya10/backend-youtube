import express from 'express';
import { verifyJWT } from '../middleware/auth.middleware.js';
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Conversation } from '../models/conversation.model.js';
import { Message } from '../models/realTimeMessages.js';
import { RemoveFromCloudinary, UploadOnCloudinary } from "../utils/cloudinary.js";

export const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const conversations = await Conversation.find({ participants: userId })
    .sort({ updatedAt: -1 })
    .populate("participants", "username fullName avatar")
    .populate("lastMessage");
  return res.json(new ApiResponse(200, conversations));
});

// ✅ Get conversation between users
export const getConversationBetween = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user._id;

  const conversation = await Conversation.findOne({
    participants: { $all: [currentUserId, userId], $size: 2 }
  });

  if (!conversation) {
    return res.status(404).json(new ApiResponse(404, null, "Conversation not found"));
  }

  return res.json(new ApiResponse(200, conversation));
});

// ✅ Get messages of a conversation
export const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const currentUserId = req.user._id;

  // ✅ Fetch messages
  const messages = await Message.find({ conversation: conversationId }).sort({ createdAt: 1 });

  // ✅ Mark all messages sent TO current user as delivered
  await Message.updateMany(
    {
      conversation: conversationId,
      to: currentUserId,
      delivered: false
    },
    { $set: { delivered: true } }
  );

  return res.json(new ApiResponse(200, messages));
});

// router.get("/unread-count", verifyJWT, asyncHandler(async (req, res) => {
  export const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const unreadConversations = await Conversation.aggregate([
    { $match: { participants: userId } },
    {
      $lookup: {
        from: "messages",
        localField: "_id",
        foreignField: "conversation",
        as: "messages",
      }
    },
    {
      $addFields: {
        unreadMessages: {
          $filter: {
            input: "$messages",
            as: "msg",
            cond: { $and: [
              { $eq: ["$$msg.to", userId] },
              { $eq: ["$$msg.delivered", false] }
            ]}
          }
        }
      }
    },
    { $match: { "unreadMessages.0": { $exists: true } } },
    { $count: "unreadCount" }
  ]);

  res.json({ unreadCount: unreadConversations[0]?.unreadCount || 0 });
});


export const MediaFileUpload = asyncHandler(async (req, res) => {
  console.log("file upload for real time messages called");
   try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    console.log("File uploaded in conversation.controller:", req.file);

    const result = await UploadOnCloudinary(req.file.path,
      [{ width: 500, height: 500, crop: "limit" }]
    );

    if (!result) {
      return res.status(500).json({ success: false, message: 'Failed to upload file' });
    }


    res.status(200).json({
      success: true,
      url: result.secure_url,
      resource_type: result.resource_type,
      public_id: result.public_id,
    });
  } catch (err) {
    console.error('Upload failed:', err);
    res.status(500).json({ success: false, message: 'Upload failed', error: err });
  }
});

