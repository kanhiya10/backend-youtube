import dotenv from "dotenv";
import connectDB from "./db/db";

dotenv.config({
    path:'./env'
})


connectDB();