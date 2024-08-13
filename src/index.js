import dotenv from "dotenv";
import connectDB from "./db/db.js";

dotenv.config({
    path:'./env'
})


connectDB()
.then(()=>{
    app.listen(process.env.Port||8000,()=>{
        console.log(`Server is running at port : ${process.env.Port}`);
    })
})
.catch((err)=>{
    console.log("MongoDb connection failed",err);
})