// routes/notifications.js
import express from 'express';
import { getMessaging } from 'firebase-admin/messaging';

const router = express.Router();

/**
 * @route POST /api/send-notification
 * @desc Send push notification to a user
 * @body { token: string, title: string, body: string }
 */
router.post('/send-notification', async (req, res) => {
  const { token, title, body } = req.body;

  if (!token || !title || !body) {
    return res.status(400).json({ error: 'token, title, and body are required.' });
  }

  const message = {
    notification: {
      title,
      body,
    },
    token,
  };

  try {
    const response = await getMessaging().send(message);
    return res.status(200).json({ message: 'Notification sent successfully!', response });
  } catch (error) {
    console.error('FCM error:', error);
    return res.status(500).json({ error: 'Failed to send notification', details: error.message });
  }
});

export default router;
