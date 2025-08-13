import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from "dotenv";
import connectDB from "./db/db.js";
import http from "http";
import { app } from "./app.js";
import { initializeApp, cert } from 'firebase-admin/app';
import trainModelFromDB, { net, isTrained } from "./utils/recommend.js";
import {setupSocket,onlineUsers} from "./socket/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = http.createServer(app);
const io = setupSocket(server);

// Start Kafka consumer with Socket.IO access
// startMessageConsumer(io,onlineUsers).catch(console.error);

// Load Firebase
const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8')
);

initializeApp({
  credential: cert(serviceAccount)
});

dotenv.config({ path: './.env' });

const modelPath = 'trainedModel.json';

connectDB()
  .then(async () => {
    // Load or train model
    if (fs.existsSync(modelPath)) {
      const savedModel = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
      net.fromJSON(savedModel);
      console.log('✅ Model loaded from disk.');
    } else {
      console.log('🔁 No model found. Training...');
      await trainModelFromDB();
    }

    // Start server
    server.listen(process.env.PORT || 8000, () => {
      console.log(`🚀 Server running at port: ${process.env.PORT || 8000}`);
    });
  })
  .catch((err) => {
    console.log("❌ App failed to start:", err);
  });
