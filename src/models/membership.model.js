import mongoose, { Schema } from "mongoose";

const MembershipSchema = new Schema(
{
    member: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    channel: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    amount: {
        type: Number,
        required: true
    },

    status: {
        type: String,
        enum: ["active", "cancelled"],
        default: "active"
    },

    startDate: Date,

    expiryDate: Date,

    paymentId: {
        type: String
    }

},
{
    timestamps: true
});

MembershipSchema.index(
    { member: 1, channel: 1 },
    { unique: true }
);

export const Membership = mongoose.model("Membership", MembershipSchema);