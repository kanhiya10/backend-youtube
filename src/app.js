import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from 'path';
import { fileURLToPath } from 'url';


// Recreate __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app=express();//An instance of the Express application

app.use(cookieParser());
// After applying this middleware, you can easily access cookies via req.cookies in your route handlers.

// app.use(cors());

app.use(cors({
    // origin:process.env.Cors_Origin,
    origin: ['https://frontend-youtube-three.vercel.app'],
    credentials:true,
}))
// This configuration allows requests from the origin specified in process.env.Cors_Origin and includes credentials (cookies, authorization headers, etc.) in cross-origin requests.

//to set the limit on the incoming json payload from the body of http request.
app.use(express.json({limit:"16kb"}))

//to handle data through url
app.use(express.urlencoded())

app.use('/uploads/course', express.static(path.join(__dirname, '../public/temp/course')));

app.use(express.static('public'))


// Serves static files (such as images, CSS, JavaScript files) from the public directory. This is useful for serving assets that are needed on the client side.


//  Middleware to parse cookies from the request headers and make them available on req.cookies

import userRouter from "./routes/user.routes.js";

import videoRouter from "./routes/video.routes.js";

import subscriptionRouter from "./routes/subscription.routes.js";

import viewVideoRouter from "./routes/viewVideo.routes.js";

import streamRouter from "./routes/stream.routes.js";

import commentRouter from "./routes/comment.routes.js";

import notificationRouter from "./routes/notification.routes.js";

import recommendationRouter from "./routes/recommend.routes.js";  

import searchRouter from "./routes/search.routes.js";

import conversationRouter from "./routes/conversation.routes.js";

import membershipRouter from "./routes/membership.routes.js";

import paymentRouter from "./routes/payment.routes.js";


app.use("/api/v1/users", userRouter);

app.use("/api/v1/videos",videoRouter)

app.use("/api/v1/subscription",subscriptionRouter)

app.use("/api/v1/viewVideo",viewVideoRouter)

app.use("/api/v1/stream",streamRouter)

app.use("/api/v1/comments", commentRouter);

app.use("/api/v1/notifications", notificationRouter);

app.use("/api/v1/recommendations", recommendationRouter);

app.use("/api/v1/search",searchRouter);

app.use("/api/v1/conversations", conversationRouter);

app.use("/api/v1/membership", membershipRouter);

app.use("/api/v1/payment", paymentRouter);

export {app};