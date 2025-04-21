import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Subscription } from "../models/subscription.model.js";



const toggleSubscription = asyncHandler(async (req, res) => {
    console.log("toggleSubscription");
    const subscriberId = req.user._id;
    const channelId = req.params.channelId;
  
    if (subscriberId.toString() === channelId.toString()) {
      throw new ApiError(400, "You cannot subscribe to yourself");
    }
  
    const existing = await Subscription.findOne({
      subscriber: subscriberId,
      channel: channelId
    });
  
    if (existing) {
        console.log("existing",existing);
      await Subscription.findByIdAndDelete(existing._id);
  
      const subscribersCount = await Subscription.countDocuments({ channel: channelId });
  
      return res.status(200).json(
        new ApiResponse(200, {
          isSubscribed: false,
          subscribersCount
        }, "Unsubscribed successfully")
      );
    } else {
        console.log("creating new subscription");
      await Subscription.create({
        subscriber: subscriberId,
        channel: channelId
      });
  
      const subscribersCount = await Subscription.countDocuments({ channel: channelId });
  
      return res.status(200).json(
        new ApiResponse(200, {
          isSubscribed: true,
          subscribersCount
        }, "Subscribed successfully")
      );
    }
  });
  
  export {toggleSubscription}