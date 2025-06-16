// utils/sendVideoUploadNotification.js
import { getMessaging } from 'firebase-admin/messaging';
import { Subscription } from '../models/subscription.model.js';
import { FcmToken } from '../models/notification.model.js';


export const sendVideoUploadNotification = async (creatorId, videoTitle, videoId) => {
  const subscriptions = await Subscription.find({ channel: creatorId }).select('subscriber');
  const subscriberIds = subscriptions.map((sub) => sub.subscriber);

  if (!subscriberIds.length) return;

  const tokens = await FcmToken.find({
    userId: { $in: subscriberIds },
    isActive: true,
  }).distinct('token');

  if (!tokens.length) return;

  const message = {
    notification: {
      title: "New Video Uploaded!",
      body: `${videoTitle} is now live. Watch now.`,
    },
    data: {
      videoId: videoId.toString(),
      creatorId: creatorId.toString(),
    },
    tokens,
  };

  const response = await getMessaging().sendEachForMulticast(message);

  console.log(`📣 Sent video upload notification to ${response.successCount}/${tokens.length}`);
};
