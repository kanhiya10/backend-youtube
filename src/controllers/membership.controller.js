import express from 'express';
import { verifyJWT } from '../middleware/auth.middleware.js';
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Membership } from '../models/membership.model.js';
import { User } from '../models/user.model.js';
import { getMembershipPricing } from '../utils/membershipPrice.js';

export const getMembershipStatus = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

//   if (req.user._id.toString() === channelId.toString()) {
//     throw new ApiError(400, "You cannot join to yourself");
//   }

   const membershipInfo = await getMembershipPricing(
        req.user._id,
        channelId
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            membershipInfo,
            "Membership status fetched successfully"
        )
    );
});

export const getChannelMembers = asyncHandler(async (req, res) => {
    const members = await Membership.find({
        channel: req.user._id
    })
    .populate(
        "member",
        "fullName username avatar"
    )
    .sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(
            200,
            members,
            "Channel members fetched successfully"
        )
    );
});