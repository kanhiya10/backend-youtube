import {FcmToken} from '../models/notification.model.js';
import { ApiError} from './ApiError.js';
import { ApiResponse } from './ApiResponse.js';

export const saveToken = async (userId, token, platform = 'web') => {
  const existing = await FcmToken.findOne({ token });

  if (existing && existing.userId.toString() !== userId.toString()) {
    throw new ApiError(403, 'This token is already registered to another user.');
  }

  await FcmToken.findOneAndUpdate(
    { token },
    {
      userId,
      platform,
      lastUsedAt: new Date(),
      isActive: true,
    },
    { upsert: true, new: true }
  );

  return new ApiResponse(200, null, 'FCM token saved successfully');
};
