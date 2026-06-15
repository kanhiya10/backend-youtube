// routes/notifications.js
import express from 'express';
import { getMessaging } from 'firebase-admin/messaging';
import { saveTokenHandler,subscribeToTopic,unsubscribeFromTopic,deactivateToken, fetchUsersNotifications,dummyNotification,getMyTopics,getAllTopics,createTopic,sendTopicNotification,dummyToMyself,deleteNotification,deleteAllNotifications } from '../controllers/notification.controller.js';
import { verifyJWT} from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { upload } from '../middleware/multer.middleware.js';

const router = express.Router();


router.route('/subscribe').post(verifyJWT, subscribeToTopic);
router.route('/unsubscribe').post(verifyJWT,unsubscribeFromTopic);
router.route('/my-topics').get(verifyJWT,getMyTopics);
router.route('/deactivate-token').post(verifyJWT,deactivateToken);
router.route('/save-token').post(verifyJWT,saveTokenHandler);
router.route('/fetchUserNotifications').get(verifyJWT,fetchUsersNotifications);
router.route('/dummy-notification').get(verifyJWT, dummyNotification);
router.route('/all-topics').get(verifyJWT,getAllTopics);
router.route('/create-topic').post(verifyJWT,requireAdmin,upload.single("icon"),createTopic);
router.route('/send-topic-notification').post(verifyJWT,requireAdmin,sendTopicNotification);
router.route('/dummy-to-myself').get(verifyJWT,dummyToMyself);
router.route("/delete/:notificationId").delete(verifyJWT,deleteNotification);
router.route("/delete-all").delete(verifyJWT,deleteAllNotifications);
// router.route("/mark-all-as-read").patch(markAllNotificationsAsRead);

export default router;
