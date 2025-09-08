
---

# ✅ README for **Backend Repo** (Node.js, Express, Render)

```markdown
# 🎥 VideoTube Backend

[![Node.js](https://img.shields.io/badge/Node.js-18-green)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4-black)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)](https://www.mongodb.com/)
[![Render](https://img.shields.io/badge/Deployed%20on-Render-purple)](https://render.com/)

This is the **backend API** of **VideoTube**, powering authentication, video streaming, subscriptions, notifications, and real-time messaging.  
Deployed on **Render** free tier.

👉 **Live API Base URL**: [https://your-render-backend.onrender.com/api/v1](https://your-render-backend.onrender.com/api/v1)

⚠️ **Note**: Render free tier spins down when inactive. First request may take **30–60 seconds**.

---

## 🚀 Features
- 👤 **Authentication** – Email/Password + Google OAuth  
- 🎬 **Video Upload** – Via Cloudinary (secure storage & streaming)  
- 📡 **Live Streaming API** – Socket.io for real-time chat  
- 🔔 **Subscriptions & Notifications** – Push updates for new uploads  
- 📂 **RESTful APIs** – For videos, users, comments, likes  
- 🗄️ **MongoDB Atlas** – Database  

---

## 🛠️ Tech Stack
- **Node.js + Express** – REST APIs  
- **MongoDB (Atlas)** – Database  
- **Mongoose** – ODM  
- **Cloudinary** – Video storage  
- **Socket.io** – Live chat  
- **JWT + Cookies** – Auth with refresh tokens  

---

## 📂 Project Structure
src/
┣ models/ # Mongoose Schemas
┣ routes/ # Express Routes
┣ controllers/ # API Logic
┣ middlewares/ # Auth & Error Handling
┣ utils/ # Helpers
┗ index.js # Server Entry


---

## 🔧 Getting Started (Local Setup)

1. Clone repo
   ```bash
   git clone https://github.com/your-username/videotube-backend.git
   cd videotube-backend
2.npm install
3.PORT=8001
  MONGODB_URI=your_mongo_uri
  CLOUDINARY_CLOUD_NAME=xxx
  CLOUDINARY_API_KEY=xxx
  CLOUDINARY_API_SECRET=xxx
  JWT_SECRET=supersecret
4.npm run dev

📑 API Endpoints
Auth

POST /users/register → Register user

POST /users/login → Login user

POST /users/refresh-token → Refresh JWT

Videos

POST /videos/upload → Upload video

GET /videos/:id → Get video by ID

GET /videos/randomVideos → Random video feed

Subscriptions

POST /subscribe/:channelId

GET /subscriptions/:userId

Contributions are welcome! Please fork this repo & open PRs.

