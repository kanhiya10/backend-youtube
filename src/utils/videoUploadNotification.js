// utils/sendNotification.js
import { getMessaging } from 'firebase-admin/messaging';
import { Subscription } from '../models/subscription.model.js';
import { FcmToken } from '../models/notification.model.js';

/**
 * Send notification to all subscribers of a creator
 * @param {string} creatorId - The creator/channel ID
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Extra payload data (e.g. videoId, topic, etc.)
 */
export const sendNotification = async (creatorId, title, body, data = {}) => {
  const subscriptions = await Subscription.find({ channel: creatorId }).select('subscriber');
  const subscriberIds = subscriptions.map((sub) => sub.subscriber);

  if (!subscriberIds.length) return;

  const tokens = await FcmToken.find({
    userId: { $in: subscriberIds },
  }).distinct('token');

  if (!tokens.length) return;

  const message = {
    notification: { title, body },
    data: { creatorId: creatorId.toString(), ...data },
    tokens,
  };

  const response = await getMessaging().sendEachForMulticast(message);

  console.log(
    `📣 Sent "${title}" notification to ${response.successCount}/${tokens.length} devices`
  );
};

export const sendUserNotification = async (
  userIds, // string | string[]
  title,
  body,
  data = {}
) => {
  const userIdArray = Array.isArray(userIds) ? userIds : [userIds];

  console.log("sendUserNotification called with:", {
    userIds: userIdArray,
    title,
    body,
    data,
  });

  // fetch tokens for all userIds
  const tokens = await FcmToken.find({ userId: { $in: userIdArray } }).distinct(
    "token"
  );

  if (!tokens.length) return;

  console.log("tokens", tokens);

  const message = {
    notification: { title, body },
    data: { ...data },
    tokens,
  };

  const response = await getMessaging().sendEachForMulticast(message);

  console.log(
    `📨 Sent "${title}" to ${response.successCount}/${tokens.length} devices for users ${userIdArray.join(
      ", "
    )}`
  );
};

