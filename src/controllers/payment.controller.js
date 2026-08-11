import express from 'express';
import { verifyJWT } from '../middleware/auth.middleware.js';
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import { getMembershipPricing } from '../utils/membershipPrice.js';
import { Payment } from '../models/payment.model.js';
import { Membership } from '../models/membership.model.js';
import { PaymentTransaction } from '../models/paymentTranx.model.js';

var instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
})


export const createOrderId = asyncHandler(async (req, res) => {
    const { channelId } = req.body;

    const membershipInfo = await getMembershipPricing(
        req.user._id,
        channelId
    );

    if (req.user._id.toString() === channelId.toString()) {
    throw new ApiError(400, "You cannot subscribe to yourself");
  }

    // Don't allow another purchase if membership is still active
    if (membershipInfo.status === "active") {
        throw new ApiError(
            400,
            "You already have an active membership"
        );
    }

    const amount = membershipInfo.displayPrice;

    const order = await instance.orders.create({
        amount: amount * 100,
        currency: "INR",
        receipt: `membership_${req.user._id}`,
        notes: {
            channelId,
            memberId: req.user._id.toString()
        }
    });

    await Payment.create({
        user: req.user._id,
        channel: channelId,
        itemType: "Membership",
        amount,
        currency: "INR",
        status: "pending",
        razorpayOrderId: order.id
    });

    return res.status(200).json({
        data: order
    });

});

export const verifyPayment = asyncHandler(async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature } = req.body;


        const generatedSignature = crypto
            .createHmac(
                "sha256",
                process.env.RAZORPAY_KEY_SECRET
            )
            .update(
                razorpay_order_id + "|" + razorpay_payment_id
            )
            .digest("hex");

        if (razorpay_signature != generatedSignature) {
            throw new ApiError(400, "Invalid payment signature");
        }

        const order = await instance.orders.fetch(razorpay_order_id);
        const amount = order.amount / 100;

        const startDate = new Date();

        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 1);

        const channelId = order.notes.channelId;
        const memberId = req.user._id;

        const existingMembership = await Membership.findOne({
            member: req.user._id,
            channel: channelId
        });

        let membership;
        if (!existingMembership) {
            membership = await Membership.create({
                member: memberId,
                channel: channelId,
                amount,
                status: "active",
                startDate,
                expiryDate,
                paymentId: razorpay_payment_id
            });
        } else {
            existingMembership.amount = amount;
            existingMembership.status = "active";
            existingMembership.startDate = startDate;
            existingMembership.expiryDate = expiryDate;
            existingMembership.paymentId = razorpay_payment_id;

            membership = await existingMembership.save();
        }

        const payment = await Payment.findOne({
            razorpayOrderId: razorpay_order_id
        });
        payment.status = "success";
        payment.itemId = membership._id;

        await payment.save();


        await PaymentTransaction.create({
            payment: payment._id,
            gateway: "razorpay",
            transactionId: razorpay_payment_id,
            status: "captured",
            gatewayResponse: {
                orderId: razorpay_order_id,
                paymentId: razorpay_payment_id,
                signature: razorpay_signature
            }
        });


        return res.status(200).json({ message: "Payment verified successfully" });



    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal Server Error!" });
    }
});

// your next step should be to use a MongoDB transaction/session around:Membership
//     +
// Payment
//     +
// PaymentTransaction
// so either all three are saved or none are saved. That will make your payment flow much more reliable.

export const failPayment = asyncHandler(async (req, res) => {
    try {
        const error = req.body;

        const payment = await Payment.findOne({
            razorpayOrderId: error.metadata.order_id
        });

        if (!payment) {
            throw new ApiError(404, "Payment not found");
        }

        payment.status = "failed";

        await payment.save();

        await PaymentTransaction.create({
            payment: payment._id,
            gateway: "razorpay",
            transactionId: error.metadata.payment_id,
            status: "failed",
            gatewayResponse: error
        });

        return res.status(200).json(
            new ApiResponse(
                200,
                {},
                "Failed payment recorded successfully"
            )
        );


    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal Server Error!" });
    }
});
