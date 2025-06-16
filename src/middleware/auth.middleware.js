import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js"

export const verifyJWT=asyncHandler(async(req,res,next)=>{
try{

    console.log("req.cookies:", req.cookies['accessToken']);
    const token=req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")

    console.log("Token received:", token);
    if(!token){
        throw new ApiError(401,"Unauthorized request")
    }

    const decodeToken=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)

    const user=await User.findById(decodeToken?._id).select("-password -refreshToken")

    if(!user){
        throw new ApiError(401,"Invalid Access Token")
    }

    console.log('okay report h')

    req.user=user
    next()

}
catch(error){
    console.log("verifyJwt not working");
    throw new ApiError(401,error?.message||"Invalid Access Token")
}
}
)
