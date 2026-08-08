import mongoose, { Schema } from "mongoose";

const PaymentSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        channel: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        itemType: {
            type: String,
            enum: [
                "Membership",
                "Order",
                "Course",
                "Donation"
            ],
            required: true
        },

        itemId: {
            type: Schema.Types.ObjectId,
            refPath: "itemType"
        },

        amount: {
            type: Number,
            required: true,
            min: 0
        },

        currency: {
            type: String,
            default: "INR"
        },

        razorpayOrderId: {
            type: String,
            unique: true
        },

        status: {
            type: String,
            enum: [
                "pending",
                "success",
                "failed",
                "refunded"
            ],
            default: "pending"
        }
    },
    {
        timestamps: true
    }
);

export const Payment = mongoose.model("Payment", PaymentSchema);