// recommendationModel.js - FIXED BRAIN.JS LOADING ISSUE
import brain from 'brain.js';
import { User } from '../models/user.model.js';
import { Video } from '../models/video.model.js';
import { Comment } from '../models/comment.model.js';
import { Subscription } from '../models/subscription.model.js';
import fs from 'fs';

// Initialize network with proper configuration
export const net = new brain.NeuralNetwork({
  inputSize: 8,  // Number of features in our input vector
  hiddenLayers: [8, 4],
  outputSize: 1,  // Single output for 'like' prediction
  learningRate: 0.01
});

export let isTrained = false;
export let userIndexMap = new Map();
export let videoIndexMap = new Map();
export let videoFeatures = new Map();

// Create consistent feature vectors for users and videos
async function createFeatureMaps() {
  
  const users = await User.find({}).select('_id username');
  const videos = await Video.find({}).select('_id owner duration views createdAt title');
  
  // Create index maps
  users.forEach((user, index) => {
    userIndexMap.set(user._id.toString(), index);
  });
  
  videos.forEach((video, index) => {
    videoIndexMap.set(video._id.toString(), index);
    
    const daysSinceCreation = (Date.now() - new Date(video.createdAt)) / (1000 * 60 * 60 * 24);
    const normalizedViews = Math.log(video.views + 1) / 15;
    const normalizedDuration = Math.min(video.duration / 3600, 1);
    
    videoFeatures.set(video._id.toString(), {
      age: Math.min(daysSinceCreation / 365, 1),
      popularity: Math.min(normalizedViews, 1),
      duration: normalizedDuration,
      titleLength: Math.min((video.title?.length || 0) / 100, 1),
      ownerIndex: userIndexMap.get(video.owner?.toString()) || 0
    });
  });
  
}

// Create feature vector - returns ARRAY instead of object
function createFeatureVector(userId, videoId) {
  const userIndex = userIndexMap.get(userId.toString());
  const videoIndex = videoIndexMap.get(videoId.toString());
  const videoFeats = videoFeatures.get(videoId.toString());
  
  if (userIndex === undefined || videoIndex === undefined || !videoFeats) {
    return null;
  }
  
  // Return as ARRAY for brain.js compatibility
  return [
    userIndex / Math.max(userIndexMap.size, 1),                    // user_factor
    videoIndex / Math.max(videoIndexMap.size, 1),                 // video_factor  
    videoFeats.age,                                               // video_age
    videoFeats.popularity,                                        // video_popularity
    videoFeats.duration,                                          // video_duration
    videoFeats.titleLength,                                       // video_title_length
    (videoFeats.ownerIndex || 0) / Math.max(userIndexMap.size, 1), // video_owner_factor
    (userIndex * videoIndex) / Math.max(userIndexMap.size * videoIndexMap.size, 1) // interaction
  ];
}

export default async function trainModelFromDB() {
  await createFeatureMaps();
  
  const trainingData = [];

  // 1. Process video likes/dislikes
  const videos = await Video.find({}).select('likedBy dislikedBy owner');
  for (const video of videos) {
    if (video.likedBy && video.likedBy.length > 0) {
      video.likedBy.forEach(userId => {
        const features = createFeatureVector(userId, video._id);
        if (features) {
          trainingData.push({
            input: features,
            output: [0.9] // Array format for brain.js
          });
        }
      });
    }
    
    if (video.dislikedBy && video.dislikedBy.length > 0) {
      video.dislikedBy.forEach(userId => {
        const features = createFeatureVector(userId, video._id);
        if (features) {
          trainingData.push({
            input: features,
            output: [0.1]
          });
        }
      });
    }
  }

  // 2. Process comments
  const comments = await Comment.find({}).select('user video likes dislikes');
  for (const comment of comments) {
    const features = createFeatureVector(comment.user, comment.video);
    if (features) {
      trainingData.push({
        input: features,
        output: [0.7]
      });
    }

    if (comment.likes && comment.likes.length > 0) {
      comment.likes.forEach(userId => {
        const features = createFeatureVector(userId, comment.video);
        if (features) {
          trainingData.push({
            input: features,
            output: [0.6]
          });
        }
      });
    }
    
    if (comment.dislikes && comment.dislikes.length > 0) {
      comment.dislikes.forEach(userId => {
        const features = createFeatureVector(userId, comment.video);
        if (features) {
          trainingData.push({
            input: features,
            output: [0.2]
          });
        }
      });
    }
  }

  // 3. Process subscriptions
  const subscriptions = await Subscription.find({})
    .populate('channel', '_id')
    .select('subscriber channel');
    
  for (const sub of subscriptions) {
    if (!sub.channel || !sub.subscriber) continue;
    
    const channelUserId = sub.channel._id;
    const channelVideos = videos.filter(v => 
      v.owner && v.owner.toString() === channelUserId.toString()
    );
    
    for (const video of channelVideos) {
      const features = createFeatureVector(sub.subscriber, video._id);
      if (features) {
        trainingData.push({
          input: features,
          output: [0.8]
        });
      }
    }
  }

  // 4. Process watch history
  const users = await User.find({}).select('watchHistory');
  for (const user of users) {
    if (!user.watchHistory || user.watchHistory.length === 0) continue;
    
    user.watchHistory.forEach(videoId => {
      const features = createFeatureVector(user._id, videoId);
      if (features) {
        trainingData.push({
          input: features,
          output: [0.6]
        });
      }
    });
  }

  // 5. Add negative samples
  const userIds = Array.from(userIndexMap.keys());
  const videoIds = Array.from(videoIndexMap.keys());
  
  if (userIds.length > 0 && videoIds.length > 0) {
    const negativeCount = Math.min(200, Math.floor(trainingData.length * 0.3));
    
    for (let i = 0; i < negativeCount; i++) {
      const randomUserId = userIds[Math.floor(Math.random() * userIds.length)];
      const randomVideoId = videoIds[Math.floor(Math.random() * videoIds.length)];
      
      const features = createFeatureVector(randomUserId, randomVideoId);
      if (features) {
        // Check if we already have positive data for this combo
        const hasPositive = trainingData.some(d => 
          JSON.stringify(d.input) === JSON.stringify(features) && d.output[0] > 0.5
        );
        
        if (!hasPositive) {
          trainingData.push({
            input: features,
            output: [0.1]
          });
        }
      }
    }
  }

  if (trainingData.length === 0) {
    throw new Error("No training data found to train the model");
  }

  
  try {
    net.train(trainingData, {
      iterations: 3000,
      log: true,
      logPeriod: 300,
      errorThresh: 0.005,
    });
    
    isTrained = true;

    // Save model with proper structure
    const modelData = {
      network: net.toJSON(),
      userIndexMap: Array.from(userIndexMap.entries()),
      videoIndexMap: Array.from(videoIndexMap.entries()),
      videoFeatures: Array.from(videoFeatures.entries()),
      trainingDataCount: trainingData.length,
      timestamp: new Date().toISOString(),
      networkConfig: {
        inputSize: 8,
        hiddenLayers: [8, 4],
        outputSize: 1,
        learningRate: 0.01
      }
    };
    
    fs.writeFileSync('trainedModel.json', JSON.stringify(modelData, null, 2));
    
  } catch (error) {
    console.error('Training failed:', error);
    throw error;
  }
}

// utils/recommend.js mein predict function ko replace kar do:

export function predict(userId, videoId) {
  if (!isTrained) {
    throw new Error("Model not trained yet");
  }
  
  const features = createFeatureVector(userId, videoId);
  if (!features) {
    // console.warn(`Could not create features for user ${userId} and video ${videoId}`);
    return { like: 0.5 };
  }
  
  try {
    const result = net.run(features);
    
    // Handle all possible result formats
    let likeScore = 0.5;
    
    if (result instanceof Float32Array) {
      likeScore = result[0]; // Extract number from Float32Array
    } else if (Array.isArray(result)) {
      likeScore = result[0];
    } else if (typeof result === 'number') {
      likeScore = result;
    } else if (result && typeof result === 'object' && result.like) {
      if (result.like instanceof Float32Array) {
        likeScore = result.like[0];
      } else {
        likeScore = result.like;
      }
    }
    
    // Ensure it's a proper number
    likeScore = Number(likeScore);
    
    // Clamp between 0 and 1
    likeScore = Math.max(0, Math.min(1, likeScore));
    
    return { like: likeScore }; // Now it's a proper number!
    
  } catch (error) {
    console.error('Prediction error:', error);
    return { like: 0.5 };
  }
}

// Fixed model loading function
export function loadSavedModel(modelPath) {
  if (!fs.existsSync(modelPath)) {
    throw new Error(`Model file not found at ${modelPath}`);
  }
  
  try {
    const modelData = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
    
    // Create new network with saved config
    const config = modelData.networkConfig || {
      inputSize: 8,
      hiddenLayers: [8, 4],
      outputSize: 1,
      learningRate: 0.01
    };
    
    // Initialize network with proper config FIRST
    const loadedNet = new brain.NeuralNetwork(config);
    
    // THEN load the saved state
    loadedNet.fromJSON(modelData.network);
    
    // Replace our global net
    Object.setPrototypeOf(net, Object.getPrototypeOf(loadedNet));
    Object.assign(net, loadedNet);
    
    isTrained = true;
    
    // Restore feature maps
    userIndexMap = new Map(modelData.userIndexMap);
    videoIndexMap = new Map(modelData.videoIndexMap);
    videoFeatures = new Map(modelData.videoFeatures);
    
    
  } catch (error) {
    console.error('Failed to load model:', error);
    throw error;
  }
}

// Utility function to get model stats
export function getModelStats() {
  return {
    isTrained,
    userCount: userIndexMap.size,
    videoCount: videoIndexMap.size,
    featuresCount: videoFeatures.size
  };
}

// Initialize model on startup (safer approach)
export async function initializeModel() {
  try {
    if (fs.existsSync('trainedModel.json')) {
      loadSavedModel('trainedModel.json');
    } else {
      await trainModelFromDB();
    }
  } catch (error) {
    console.error('❌ Model initialization failed:', error.message);
    throw error;
  }
}