// recommendationModel.js
import brain from 'brain.js';
import { User } from '../models/user.model.js';
import { Video } from '../models/video.model.js';
import { Comment } from '../models/comment.model.js';
import { Subscription } from '../models/subscription.model.js';
import fs from 'fs';

export const net = new brain.NeuralNetwork();
export let isTrained = false;

export default async function trainModelFromDB() {
  const trainingData = [];

  console.log('⏳ Fetching data from DB...');

  // 1. Use likes and dislikes from Videos
  const videos = await Video.find({}).select('likedBy dislikedBy owner');
  for (const video of videos) {
    // Likes
    video.likedBy.forEach(userId => {
      trainingData.push({
        input: { [userId.toString()]: 1, [video._id.toString()]: 1 },
        output: { like: 1 }
      });
    });
    // Dislikes
    video.dislikedBy.forEach(userId => {
      trainingData.push({
        input: { [userId.toString()]: 1, [video._id.toString()]: 1 },
        output: { like: 0 }
      });
    });
  }

  // 2. Use comments as positive signals (user commented on video → like)
  const comments = await Comment.find({}).select('user video likes dislikes');
  for (const comment of comments) {
    trainingData.push({
      input: { [comment.user.toString()]: 1, [comment.video.toString()]: 1 },
      output: { like: 1 }
    });

    // Optional: include comment likes/dislikes for fine-grained signal
    comment.likes.forEach(userId => {
      trainingData.push({
        input: { [userId.toString()]: 1, [comment.video.toString()]: 1 },
        output: { like: 1 }
      });
    });
    comment.dislikes.forEach(userId => {
      trainingData.push({
        input: { [userId.toString()]: 1, [comment.video.toString()]: 1 },
        output: { like: 0 }
      });
    });
  }

  // 3. Use subscriptions - user subscribed to a channel means user likes channel videos
  const subscriptions = await Subscription.find({}).populate('channel');
  for (const sub of subscriptions) {
    const channelUserId = sub.channel._id;
    // Find videos owned by that channel user
    const channelVideos = videos.filter(v => v.owner.toString() === channelUserId.toString());
    for (const video of channelVideos) {
     if (sub?.subscriber && video?._id) {
  trainingData.push({
    input: {
      [sub.subscriber.toString()]: 1,
      [video._id.toString()]: 1
    },
    output: { like: 1 }
  });
} else {
  console.warn('Skipping invalid training data: ', { sub, video });
}

    }
  }

  // 4. Use watchHistory from users (user watched video → like)
  const users = await User.find({}).select('watchHistory');
  for (const user of users) {
    if (!user.watchHistory) continue;
    user.watchHistory.forEach(videoId => {
      trainingData.push({
        input: { [user._id.toString()]: 1, [videoId.toString()]: 1 },
        output: { like: 1 }
      });
    });
  }

  // 5. Add some negative samples randomly for training balance
  // Random user/video pairs without known interaction
  for (let i = 0; i < 100; i++) {
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const randomVideo = videos[Math.floor(Math.random() * videos.length)];

    // Check if already positive training data exists to avoid conflicts
    const exists = trainingData.some(
      d => d.input[randomUser._id.toString()] === 1 && d.input[randomVideo._id.toString()] === 1
    );
    if (!exists) {
      trainingData.push({
        input: { [randomUser._id.toString()]: 1, [randomVideo._id.toString()]: 1 },
        output: { like: 0 }
      });
    }
  }

  if (trainingData.length === 0) {
    throw new Error("No training data found to train the model");
  }

  console.log(`⚡ Training model on ${trainingData.length} samples...`);
  net.train(trainingData, {
    iterations: 20000,
    log: true,
    logPeriod: 1000,
    learningRate: 0.3,
  });
  isTrained = true;

  const modelJSON = JSON.stringify(net.toJSON());
fs.writeFileSync('trainedModel.json', modelJSON);
console.log('Model saved successfully!');
  console.log('✅ Model trained successfully!');
}

// Prediction function: returns confidence of user liking a video
export function predict(userId, videoId) {
  if (!isTrained) throw new Error("Model not trained yet, call trainModelFromDB() first");
  const input = { [userId]: 1, [videoId]: 1 };
  return net.run(input); // e.g. { like: 0.85 }
}
