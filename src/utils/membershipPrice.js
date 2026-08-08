import { User } from "../models/user.model.js";
import { Membership } from "../models/membership.model.js";
import { ApiError } from "./ApiError.js";

export const getMembershipPricing = async (memberId, channelId) => {
    const channel = await User.findById(channelId)
        .select("membershipPrice");

    if (!channel) {
        throw new ApiError(404, "Channel not found");
    }

    const membership = await Membership.findOne({
        member: memberId,
        channel: channelId,
    });

    // No previous membership
    if (!membership) {
        return {
            status: null,
            membership: null,
            displayPrice: channel.membershipPrice,
        };
    }

    let status = membership.status;

    // Dynamically determine expiry
    if (
        membership.status === "active" &&
        membership.expiryDate &&
        membership.expiryDate <= new Date()
    ) {
        status = "expired";
    }

    // Active member sees the amount of their current membership
    const displayPrice =
        status === "active"
            ? membership.amount
            : channel.membershipPrice;

    return {
        status,
        membership,
        displayPrice,
    };
};