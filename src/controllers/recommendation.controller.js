// src/controllers/recommendation.controller.js
import brain from 'brain.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Video } from '../models/video.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modelPath = path.join(__dirname, '../../trainedModel.json');
let net = null;
let isModelLoaded = false;

const loadModel = () => {
  console.log('Looking for model at:', modelPath);

  if (!fs.existsSync(modelPath)) {
    throw new Error(`Model file not found at ${modelPath}`);
  }

  const trainedModelJSON = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
  net = new brain.NeuralNetwork();
  net.fromJSON(trainedModelJSON);
  isModelLoaded = true;
  console.log('✅ Model loaded in controller');
};

export const predictVideo = (req, res) => {
  try {
    if (!isModelLoaded) {
      loadModel(); // Lazy-load the model when the route is first hit
    }

    const { userId, videoId } = req.params;

    const input = {
      [userId]: 1,
      [videoId]: 1,
    };

    const output = net.run(input); // { like: 0.92 } for example

    res.json({ success: true, prediction: output });
  } catch (err) {
    console.error('Prediction error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};


export async function getCandidateVideos() {
  // Fetch recent 50 videos as candidates
  const videos = await Video.find()
    .sort({ createdAt: -1 }) // latest first
    .limit(5)
    .lean(); // convert to plain JS objects for faster reads

  return videos;
}

export const getRecommendedVideos=asyncHandler(async(req, res) => {

    if (!isModelLoaded) {
     loadModel(); // wait for model to load before proceeding
  }
  const userId  = req.user._id;
  console.log(`🔍 Fetching recommendations for user ${userId}`);
  if (!userId) {
    return res.status(400).json({ success: false, message: 'User ID is required' });
  }
  const candidateVideos = await getCandidateVideos(); // e.g., from DB, based on category or recency

  const scoredVideos = [];

  for (const video of candidateVideos) {
    const input = { [userId]: 1, [video.id]: 1 };
    const prediction = net.run(input);
    scoredVideos.push({ video, score: prediction.like || 0 });
  }

  scoredVideos.sort((a, b) => b.score - a.score);

  console.log(`🔍 Recommended ${scoredVideos.length} videos for user ${userId}`);

  res.json({
  success: true,
  recommended: scoredVideos.slice(0, 3).map(v => v.video),
});}
);

