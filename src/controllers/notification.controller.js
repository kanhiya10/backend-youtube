import { FcmToken } from '../models/notification.model.js';
import { getMessaging } from 'firebase-admin/messaging';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { saveToken } from '../utils/saveToken.js';
import { Notification } from '../models/notificationEntries.model.js';
import { Subscription } from '../models/subscription.model.js';
import { sendNotification } from '../utils/videoUploadNotification.js';
import { Topic } from '../models/topic.model.js';
import { UploadOnCloudinary } from '../utils/cloudinary.js';

/**
 * @route POST /api/notifications/subscribe
 * @desc Subscribes user's FCM token to a topic
 * @body { token: string, topic: string }
 */

export const subscribeToTopic = asyncHandler(async (req, res) => {
  const { token, topic } = req.body;
  const userId = req.user._id;

  if (!token || !topic) {
    throw new ApiError(400, "Token and topic are required.");
  }

  // Subscribe to topic in Firebase
  await getMessaging().subscribeToTopic([token], topic);

  // Ensure FCM token exists for this user
  await FcmToken.updateOne(
    { token },
    {
      $set: { userId, isActive: true, lastUsedAt: new Date() },
    },
    { upsert: true }
  );

  // Add user to topic in DB
  await Topic.updateOne(
    { name: topic },
    { $addToSet: { subscribers: userId } },
    { upsert: true }
  );

  res.status(200).json(new ApiResponse(200, null, `Subscribed to ${topic}`));
});

/**
 * @route POST /api/notifications/unsubscribe
 * @desc Unsubscribes user's FCM token from a topic
 * @body { token: string, topic: string }
 */
export const unsubscribeFromTopic = asyncHandler(async (req, res) => {
  const { token, topic } = req.body;
  const userId = req.user._id;

  if (!token || !topic) {
    throw new ApiError(400, "Token and topic are required.");
  }

  // Unsubscribe from topic in Firebase
  await getMessaging().unsubscribeFromTopic([token], topic);

  // Remove user from topic in DB
  await Topic.updateOne(
    { name: topic },
    { $pull: { subscribers: userId } }
  );

  res.status(200).json(new ApiResponse(200, null, `Unsubscribed from ${topic}`));
});

// Save or update FCM token
export const saveTokenHandler = asyncHandler(async (req, res) => {
  const { token, platform = 'web' } = req.body;
  const userId = req.user?._id;

  if (!token || !userId) {
    throw new ApiError(400, 'Missing token or user');
  }

  const result = await saveToken(userId, token, platform);

  console.log('FCM Token saved:', result);
  res.status(200).json(result);
});


// export const getSubscribedTopics = asyncHandler(async (req, res) => {
//   const { token } = req.query;

//   if (!token) {
//     return res.status(400).json({ error: 'FCM token is required.' });
//   }

//   const fcm = await FcmToken.findOne({ token });

//   if (!fcm) {
//     return res.status(404).json({ error: 'Token not found' });
//   }

//   res.status(200).json({
//     topics: fcm.topics || []
//   });
// });

// Fetch topics subscribed by the logged-in user
export const getMyTopics = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  const topics = await Topic.find({ subscribers: userId })
    .select("name displayName description icon subscribers createdAt updatedAt")
    .lean();

  const formatted = topics.map(t => ({
    ...t,
    subscriberCount: t.subscribers?.length || 0,
    subscribers: undefined, // hide full array
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, { topics: formatted }, "Subscribed topics fetched successfully"));
});


export const deactivateToken = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    res.status(400);
    throw new Error("FCM token is required");
  }

  const deleted = await FcmToken.findOneAndDelete({ token });

  if (!deleted) {
    return res.status(404).json({ message: "Token not found" });
  }

  res.status(200).json({ message: "Token removed successfully", token });
});


export const fetchUsersNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate('actor', 'username')
    .limit(50); // limit recent 50, for example

  res.status(200).json(new ApiResponse(200, notifications, "Fetched user notifications"));
});



export const getAllTopics = asyncHandler(async (req, res) => {
  const topics = await Topic.find({})
    .select("name displayName description icon subscribers createdAt updatedAt")
    .lean();

  // Map subscriber count instead of full array
  const formatted = topics.map(t => ({
    ...t,
    subscriberCount: t.subscribers?.length || 0,
    subscribers: undefined, // remove full array
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, { topics: formatted }, "Topics fetched successfully"));
});


export const createTopic = asyncHandler(async (req, res) => {
  const { name, displayName, description } = req.body;

  const icon = req.file ? req.file.path : null;

  const iconUrl=await UploadOnCloudinary(icon);

  if (!name || !displayName) {
    throw new ApiError(400, "Name and displayName are required");
  }

  const normalizedName = name.trim().toLowerCase();

  const existing = await Topic.findOne({ name: normalizedName });
  if (existing) {
    throw new ApiError(400, "Topic already exists");
  }

  const topic = await Topic.create({
    name: normalizedName,
    displayName: displayName.trim(),
    description,
    icon: iconUrl.url || null,
    createdBy: req.user?._id || null,
  });

  res
    .status(201)
    .json(new ApiResponse(201, topic, "Topic created successfully"));
});

export const sendTopicNotification = asyncHandler(async (req, res) => {

  console.log("Sending topic notification:", req.body);
  const { topicName, title, body, data } = req.body;

  if (!topicName || !title || !body) {
    throw new ApiError(400, "topicName, title and body are required");
  }

  // Normalize name (same as when creating topics)
  const normalized = topicName.trim().toLowerCase();

  // Check if topic exists
  const topic = await Topic.findOne({ name: normalized });
  if (!topic) {
    throw new ApiError(404, "Topic not found");
  }

  // Build message payload
  const message = {
    notification: {
      title,
      body,
    },
    data: data || {}, // optional key-value payload
    topic: normalized, // FCM topic name
  };

  // Send to FCM topic
  const response = await getMessaging().send(message);

  try{
      return res
    .status(200)
    .json(new ApiResponse(200, { response }, `Notification sent to topic '${normalized}'`));
  }catch(error){
    console.error('Error sending topic notification:', error);
    throw new ApiError(500, 'Failed to send notification');
  }
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  const userId = req.user._id;

  try {
    // Find the notification and verify ownership
    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json(new ApiError(404, "Notification not found"));
    }

    // Check if the current user is the owner of this notification
    if (notification.user.toString() !== userId.toString()) {
      return res.status(403).json(new ApiError(403, "You are not authorized to delete this notification"));
    }

    // Delete the notification
    await Notification.findByIdAndDelete(notificationId);

    return res.status(200).json(
      new ApiResponse(200, null, "Notification deleted successfully")
    );
  } catch (error) {
    console.error("Error deleting notification:", error);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  }
});


export const deleteAllNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  try {
    // Delete all notifications belonging to the current user
    const deleteResult = await Notification.deleteMany({ user: userId });

    return res.status(200).json(
      new ApiResponse(
        200, 
        { deletedCount: deleteResult.deletedCount }, 
        `Successfully deleted ${deleteResult.deletedCount} notifications`
      )
    );
  } catch (error) {
    console.error("Error deleting all notifications:", error);
    return res.status(500).json(new ApiError(500, "Internal server error"));
  }
});

// export const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
//   const userId = req.user._id;

//   try {
//     // Update all unread notifications for the current user
//     const updateResult = await Notification.updateMany(
//       { user: userId, isRead: false },
//       { $set: { isRead: true } }
//     );

//     return res.status(200).json(
//       new ApiResponse(
//         200, 
//         { modifiedCount: updateResult.modifiedCount }, 
//         `Marked ${updateResult.modifiedCount} notifications as read`
//       )
//     );
//   } catch (error) {
//     console.error("Error marking all notifications as read:", error);
//     return res.status(500).json(new ApiError(500, "Internal server error"));
//   }
// });

export const dummyNotification = asyncHandler(async (req, res) => {
  const userId=req.user?._id;

   const subscriptions = await Subscription.find({ channel: userId }).select('subscriber');
  
        if (!subscriptions || subscriptions.length === 0) {
          console.log('No subscriptions found for this user');
        } else {
          console.log('Subscriptions found:', subscriptions);
  
          // const dbNotifications = subscriptions.map((sub) => ({
          //   user: sub.subscriber,           // Receiver of the notification
          //   actor: userId,            // Creator/uploader
          //   type: 'dummy',
          //   title: 'testing',
          //   body: `Dummy notification for ${sub.subscriber}`,
          //   data: "This is a custom notification text for my subscribers",
          // }));
  
          // if (dbNotifications.length) {
          //   await Notification.insertMany(dbNotifications);
          // }
          console.log('saved notifications in DB');
        }
  
          await sendNotification(
        req.user._id,
        'Dummy Video Uploaded!',
        'Watch now.',
        { videoId: 'dummy-video-id', creatorId: req.user._id.toString() }
      );

        res.status(200).json(new ApiResponse(200, null, 'Dummy notification sent'));

});

export const dummyToMyself = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  const fcmTokens = await FcmToken.find({ userId }).select('token');

  if (!fcmTokens || fcmTokens.length === 0) {
    throw new ApiError(404, 'No active FCM tokens found for this user');
  }

  const tokens = fcmTokens.map(t => t.token);

  console.log("mytokens",tokens);

  const message = {
    notification: {
      title: 'Dummy Notification to Myself',
      body: 'This is a test notification sent to myself.',
    },
    data: { customData: 'Some custom data' },
    tokens,
  };

  try {
    const response = await getMessaging().sendEachForMulticast(message);
    // getMessaging().sendEachForMulticast(message);
    console.log('Successfully sent message:', response);
    res.status(200).json(new ApiResponse(200, { response }, 'Dummy notification sent to myself'));
  } catch (error) {
    console.error('Error sending message:', error);
    throw new ApiError(500, 'Failed to send notification');
  }
});
 