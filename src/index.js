import dotenv from "dotenv"; 
// This module is used to load environment variables from a .env file into process.env
import connectDB from "./db/db.js";
import {app} from "./app.js";

dotenv.config({
    path:'./.env'
})


connectDB()
.then(()=>{
    app.listen(process.env.Port||8000,()=>{
        console.log(`Server is running at port : ${process.env.PORT}`);
    })
})
.catch((err)=>{
    console.log("MongoDb connection failed",err);
})