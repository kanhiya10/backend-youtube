import { Subscription } from "../models/subscription.model.js";

export const getSubscriptionDetails = async (channelId, subscriberId = null) => {
  // Count total subscribers for channel
  const subscribersCount = await Subscription.countDocuments({ channel: channelId });

  // Check if logged-in user is subscribed
  let isSubscribed = false;
  if (subscriberId) {
    isSubscribed = await Subscription.exists({
      subscriber: subscriberId,
      channel: channelId
    });
  }

  return {
    subscribersCount,
    isSubscribed: Boolean(isSubscribed)
  };
};

export const getUserSubscriptions = async (userId) => {
  if (!userId) {
    throw new Error("User ID is required to fetch subscriptions");
  }

  // Find subscriptions where this user is the subscriber
  const subscriptions = await Subscription.find({ subscriber: userId })
    .populate("channel", "_id fullName username avatar coverImage") // populate channel details
    .lean();

  // Extract channel info
  return subscriptions.map((sub) => sub.channel);
};

export const getUserSubscribers = async (userId) => {
  if (!userId) {
    throw new Error("User ID is required to fetch subscribers");
  }

  // Find subscriptions where this user is the channel
  const subscribers = await Subscription.find({ channel: userId })
    .populate("subscriber", "fullName username avatar") // populate subscriber details
    .lean();

  // Extract subscriber info
  return subscribers.map((sub) => sub.subscriber);
};

