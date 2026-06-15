import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

const connectDB=async()=>{
    try{
       const connectionInstance=await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
    }
    catch(error){
        // process.exit(1);
        console.log('MongoDB connection error',error);
    }
}

export default connectDB; 