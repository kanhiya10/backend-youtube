import mongoose, { Schema } from "mongoose";


const PaymentTransactionSchema = new Schema({
    payment: {
        type: Schema.Types.ObjectId,
        ref: "Payment",
        required: true
    },

    gateway: {
        type: String,
        enum: ["razorpay", "stripe"],
        required: true
    },

    transactionId: {
        type: String,
        required: true,
        unique: true
    },

    status: {
        type: String,
        enum: [
            "created",
            "authorized",
            "captured",
            "failed",
            "refunded"
        ]
    },

    gatewayResponse: Schema.Types.Mixed,

    webhookData: Schema.Types.Mixed

}, { timestamps: true });

export const PaymentTransaction = mongoose.model("PaymentTransaction", PaymentTransactionSchema);