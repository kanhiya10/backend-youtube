// recommendation.controller.js - FIXED VERSION
import { predict, getModelStats } from '../utils/recommend.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Video } from '../models/video.model.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const predictVideo = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const { videoId } = req.params;

  console.log("🔎 Prediction request:");
  console.log("   ➤ User ID:", userId);
  console.log("   ➤ Video ID:", videoId);

  const output = predict(userId, videoId);
  console.log("✅ Model Output:", output);

  res.json({ 
    success: true, 
    prediction: output,
    modelStats: getModelStats()
  });
});

// recommendation.controller.js mein ye change karo

export const getRecommendedVideos = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  console.log(`🔍 Fetching recommendations for user ${userId}`);
  
  const candidateVideos = await getCandidateVideos();
  const scoredVideos = [];

  for (const video of candidateVideos) {
    const prediction = predict(userId, video._id.toString());
    
    // Ab simple hai - prediction.like already number hai
    const score = prediction.like || 0.5;
    
    scoredVideos.push({ 
      video, 
      score: score
    });
  }

  scoredVideos.sort((a, b) => b.score - a.score);


  res.json({
    success: true,
    recommended: scoredVideos.slice(0, 8).map(v => ({
      ...v.video,
      recommendationScore: Number(v.score.toFixed(3))
    }))
  });
});

export async function getCandidateVideos() {
  try {
    // Fetch recent videos using your actual schema
    const videos = await Video.find({ isPublished: true })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("_id title thumbnail videoFile views createdAt duration")
      .lean();

    console.log(`📹 Found ${videos.length} candidate videos`);
    return videos;
    
  } catch (error) {
    console.error('Error fetching candidate videos:', error);
    return []; // Return empty array on error
  }
}

// Additional utility function for debugging
export const debugPrediction = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const { videoId } = req.params;

  console.log("🐛 Debug prediction:");
  console.log("   ➤ User ID:", userId);
  console.log("   ➤ Video ID:", videoId);

  try {
    const prediction = predict(userId, videoId);
    console.log("   ➤ Raw prediction:", prediction);
    console.log("   ➤ Prediction type:", typeof prediction);
    console.log("   ➤ Is array?:", Array.isArray(prediction));
    
    let extractedScore;
    if (prediction && typeof prediction === 'object' && !Array.isArray(prediction)) {
      extractedScore = prediction.like;
    } else if (Array.isArray(prediction)) {
      extractedScore = prediction[0];
    } else {
      extractedScore = prediction;
    }
    
    console.log("   ➤ Extracted score:", extractedScore);
    console.log("   ➤ Score type:", typeof extractedScore);

    res.json({
      success: true,
      rawPrediction: prediction,
      extractedScore: extractedScore,
      scoreType: typeof extractedScore,
      isValidNumber: typeof extractedScore === 'number' && !isNaN(extractedScore),
      modelStats: getModelStats()
    });
    
  } catch (error) {
    console.error("Debug prediction error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      modelStats: getModelStats()
    });
  }
});