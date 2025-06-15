// routes/notifications.js
import express from 'express';
import { getMessaging } from 'firebase-admin/messaging';
import { saveTokenHandler,subscribeToTopic,unsubscribeFromTopic,getSubscribedTopics,deactivateToken, fetchUsersNotifications } from '../controllers/notification.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/topics', (req, res) => {
  res.json({
    topics: ['news', 'offers', 'alerts']
  });
});


router.post('/send-topic-notification', async (req, res) => {
  const { title, body } = req.body;

if (!title || !body) {
  return res.status(400).json({ error: 'Title and body are required.' });
}


  const topic = 'highScores';

  const message = {
    notification: {
      title,
      body,
    },
    topic,
  };

  try {
    const response = await getMessaging().send(message);
    return res.status(200).json({ message: 'Notification sent successfully!', response });
  } catch (error) {
    console.error('FCM error:', error);
    return res.status(500).json({ error: 'Failed to send notification', details: error.message });
  }
});

router.route('/subscribe').post(verifyJWT, subscribeToTopic);
router.route('/unsubscribe').post(verifyJWT,unsubscribeFromTopic);
router.route('/token-topics').get(verifyJWT,getSubscribedTopics);
router.route('/deactivate-token').post(verifyJWT,deactivateToken);
router.route('/save-token').post(verifyJWT,saveTokenHandler);
router.route('/fetchUserNotifications').get(verifyJWT,fetchUsersNotifications);

export default router;
