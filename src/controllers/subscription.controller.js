import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Subscription } from "../models/subscription.model.js";
import { getSubscriptionDetails } from "../utils/subscriptionHelpers.js";
import { getUserSubscriptions } from "../utils/subscriptionHelpers.js";
import { getUserSubscribers } from "../utils/subscriptionHelpers.js";

export const toggleSubscription = asyncHandler(async (req, res) => {
  const subscriberId = req.user._id;
  const channelId = req.params.channelId;

  console.log(`🔄 Toggling subscription for user ${subscriberId} to channel ${channelId}`);

  if (subscriberId.toString() === channelId.toString()) {
    throw new ApiError(400, "You cannot subscribe to yourself");
  }

  const existing = await Subscription.findOne({ subscriber: subscriberId, channel: channelId });

  if (existing) {
    await Subscription.findByIdAndDelete(existing._id);
  } else {
    await Subscription.create({ subscriber: subscriberId, channel: channelId });
  }

  // 👇 re-use util after toggle
  const { subscribersCount, isSubscribed } = await getSubscriptionDetails(channelId, subscriberId);

  return res.status(200).json(
    new ApiResponse(200, { subscribersCount, isSubscribed }, isSubscribed ? "Subscribed" : "Unsubscribed")
  );
});



export const getMySubscriptions = async (req, res) => {
  try {
    const userId = req.user?._id;
    const subscribedChannels = await getUserSubscribers(userId);

    res.status(200).json({
      success: true,
      count: subscribedChannels.length,
      channels: subscribedChannels,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};