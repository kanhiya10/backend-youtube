import { FcmToken } from '../models/notification.model.js';
import { getMessaging } from 'firebase-admin/messaging';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { saveToken } from '../utils/saveToken.js';
import { Notification } from '../models/notificationEntries.model.js';

/**
 * @route POST /api/notifications/subscribe
 * @desc Subscribes user's FCM token to a topic
 * @body { token: string, topic: string }
 */
export const subscribeToTopic = asyncHandler(async (req, res) => {
    console.log('Subscribing to topic...');
  const { token, topic } = req.body;
  const userId = req.user._id;

  if (!token || !topic) {
    throw new ApiError(400, 'Token and topic are required.');
  }

  // Subscribe to topic via Firebase
  await getMessaging().subscribeToTopic([token], topic);

  // Update your DB
  await FcmToken.updateOne(
    { token },
    {
      $addToSet: { topics: topic },
      userId, // attach user if not already
      isActive: true,
      lastUsedAt: new Date()
    },
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

  if (!token || !topic) {
    throw new ApiError(400, 'Token and topic are required.');
  }

  // Unsubscribe from topic in Firebase
  await getMessaging().unsubscribeFromTopic([token], topic);

  // Update your DB
  await FcmToken.updateOne(
    { token },
    { $pull: { topics: topic } }
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


export const getSubscribedTopics = asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'FCM token is required.' });
  }

  const fcm = await FcmToken.findOne({ token });

  if (!fcm) {
    return res.status(404).json({ error: 'Token not found' });
  }

  res.status(200).json({
    topics: fcm.topics || []
  });
});


export const deactivateToken = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) throw new ApiError(400, 'Token is required.');

  await FcmToken.updateOne({ token }, { isActive: false });

  res.status(200).json(new ApiResponse(200, null, 'Token deactivated'));
});


export const fetchUsersNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate('actor', 'username')
    .limit(50); // limit recent 50, for example

  res.status(200).json(new ApiResponse(200, notifications, "Fetched user notifications"));
});
