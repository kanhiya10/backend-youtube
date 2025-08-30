// models/notification.model.js

import mongoose, { Schema } from 'mongoose';

const notificationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User', // The receiver of the notification
    required: true,
  },
  actor: {
    type: Schema.Types.ObjectId,
    ref: 'User', // The one who triggered the notification
    required: false,
  },
  type: {
    type: String,
    enum: ['videoUpload', 'like', 'comment', 'subscription','dummy','topicBroadcast'],
    required: true,
  },
  title: {
    type: String,
  },
  body: {
    type: String,
  },
  data: {
    type: Schema.Types.Mixed, // For IDs like videoId, postId, etc.
  },
  isRead: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

export const Notification = mongoose.model('Notification', notificationSchema);

