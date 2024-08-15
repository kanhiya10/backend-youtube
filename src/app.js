import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app=express();

app.use(cors({
    origin:process.env.Cors_Origin,
    Credential:true
}))

//to set the limit on the incoming json payload from the body of http request.
app.use(express.json({limit:"16kb"}))

//to handle data through url
app.use(express.urlencoded())

app.use(express.static('public'))

app.use(cookieParser())

import userRouter from "./routes/user.routes.js";

app.use("/api/v1/users", userRouter);

export {app};