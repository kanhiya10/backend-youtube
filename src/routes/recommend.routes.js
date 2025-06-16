import express from 'express';
import { verifyJWT } from '../middleware/auth.middleware.js';
import { predictVideo,getRecommendedVideos } from '../controllers/recommendation.controller.js';

const router = express.Router();

router.route('/recommend/:userId/:videoId').get(verifyJWT, predictVideo);

router.route('/collection').get(verifyJWT, getRecommendedVideos);

export default router;