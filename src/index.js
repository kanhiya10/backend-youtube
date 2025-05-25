import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from "dotenv";
import connectDB from "./db/db.js";
import { app } from "./app.js";
import { initializeApp, cert } from 'firebase-admin/app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(__dirname,'./config/serviceAccount.json'), 'utf-8')
);

initializeApp({
  credential: cert(serviceAccount)
});

dotenv.config({ path: './.env' });

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running at port: ${process.env.PORT || 8000}`);
    });
  })
  .catch((err) => {
    console.log("MongoDB connection failed", err);
  });
