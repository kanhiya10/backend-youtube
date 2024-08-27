import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { RemoveFromCloudinary, UploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
// import { trusted } from "mongoose";



const generateAccessAndRefereshToken=async(userId)=>{
    try{
        const user=await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken,refreshToken}
    }
    catch(error){
        throw new ApiError(500,"Something went wrong while generating access and refresh token")
    }
}

const registerUser=asyncHandler(async(req,res)=>{
    // res.status(200).json({
    //     message:'yes'
    // })

    const {fullName,username,email,password}=req.body;
console.log('email :',email);

if(
    [fullName,email,username,password].some((field)=>field?.trim()==="")
){
    throw new ApiError(400,"All fields are required")
}

const existedUser=await User.findOne({
    $or :[{email},{username}]
})

if(existedUser){
    throw new ApiError(409,"User with email or username already exists")
}

const avatarLocalPath=req.files?.avatar[0]?.path;
// const coverImageLocalPath=req.files?.coverImage[0]?.path;

let coverImageLocalPath;

if(req.files && Array.isArray(req.files.coverImage)&& req.files.coverImage.length>0){
    coverImageLocalPath=req.files.coverImage[0].path;
}

if(!avatarLocalPath){
    throw new ApiError(400,"Avatar file is required");
}

const avatar=await UploadOnCloudinary(avatarLocalPath);
const coverImage=await UploadOnCloudinary(coverImageLocalPath);

if(!avatar){
    if(!avatar){
        throw new ApiError(400,"Avatar file is required");
    }
}

const user=await User.create({
    fullName,
    avatar:avatar.url,
    coverImage:coverImage.url || "",
    email,
    password,
    username:username.toLowerCase()
})

const createdUser=await User.findById(user._id).select(
    "-password -refreshToken"
)

if(!createdUser){
    throw new ApiError(500,"Something went wrong while registering the user");
}

return res.status(201).json(
    new ApiResponse(200,createdUser,"User registered Successfully")
)


})

const loginUser=asyncHandler(async(req,res)=>{ 

    const{password,username,email}=req.body

    if(!username && !email){
        throw new ApiError(400,"username or password is required");
    }

    const user=await User.findOne({
        $or:[{username},{email}]
    })

    if(!user){
        throw new ApiError(400,"user does't exist");
    }

    console.log("line 111",user.fullName)
    console.log("line 112",user.password)

    console.log("line 113",password)

    const isPasswordValid=await user.isPasswordCorrect(password);

    // console.log("line 113",isPasswordValid);

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials");
    }

    const{accessToken,refreshToken}=await generateAccessAndRefereshToken(user._id)

    const loggedInUser=await User.findById(user._id).select("-password -refreshToken")

    const options={
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,{
            user:loggedInUser,accessToken,refreshToken
        },
    "User loggedIn successfully")
    )

})

const logoutUser=asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,{
            // $set:{
            //     refreshToken:undefined
            // }
            $unset:{
                refreshAccessToken:1//this removes the field from document.
            }
        },
        {
            new:true
        }
    )

    const options={
        httpOnly:true,
        secure:true
    }

    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged Out"))
    

})

const refreshAccessToken=asyncHandler(async(req,res)=>{

    const incomingRefreshToken=req.cookie?.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request")
    }

    try {
        const decodeToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);//if the token is successfully verified jwt.verify()
        // returns the payloaded data to decodeToken
    
        const user=await User.findById(decodeToken?._id)
    
        if(!user){
            throw new ApiError(401,"Invalid Refresh Token")
        }
    
        if(incomingRefreshToken!==user?.refreshToken){
            throw new ApiError(401,"Refresh Token is expired or used")
        }
    
        const options={
            httpOnly:true,
            secure:true
        }
    
        const {accessToken,refreshToken}=await generateAccessAndRefereshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(
            new ApiResponse(200,{
                accessToken,refreshToken
            },
        "access token refreshed successfully.")
        )
    
    
    } catch (error) {
        throw new ApiError(401,error?.message||"Invalid Refresh Token")
    }

})

const changeCurrentPassword=asyncHandler(async(req,res)=>{
    console.log("process started");

    const{oldPassword,newPassword}=req.body;

    const user=await User.findById(req.user?._id)

    const isPasswordValid=await user.isPasswordCorrect(oldPassword)

    if(!isPasswordValid){
        throw new ApiError(400,"Invalid oldPassword")
    }


    user.password=newPassword
    await user.save({validateBeforeSave:false})

    return res.status(200).json(new ApiResponse(200,{},"Password changed successfully"))
})

const getCurrentUser=asyncHandler(async(req,res)=>{
    return res.status(200)
    .json(new ApiResponse(200,req.user,"current user fetched successfully"));
})

const updateAccountDetails=asyncHandler(async(req,res)=>{

    const{fullName,email}=req.body;

    if(!fullName || !email){
        throw new ApiError(400,"All fields are required")
    }

    const user=await User.findByIdAndUpdate(req.user?._id,{
        $set:{
            fullName:fullName,
            email:email
        }
    },{
        new:true
    }).select("-password")

    return res.status(200)
    .json(new ApiResponse(200,user,"Account details updated successfully"));
})

const updateUsersAvatar=asyncHandler(async(req,res)=>{

    const avatarLocalPath=req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing")
    }

    //delete old image -assignment
    console.log("This is the localPath to be deleted",req.user?.avatar);
    const DeletePrevAvatar=await RemoveFromCloudinary(req.user?.avatar)


    
    const avatar=await UploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading on cloudinary")
    }

    const user=await User.findByIdAndUpdate(req.user?._id,{
        $set:{
            avatar:avatar.url
        }
    },{
        new:true
    }).select("-password")

    return res.status(200)
    .json(new ApiResponse(200,req.user,"avatar updated successfully"))
})


const updateUsersCoverImage=asyncHandler(async(req,res)=>{

    const coverImageLocalPath=req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400,"coverImage file is missing")
    }

    console.log("This is the localPath of coverImage to be deleted",req.user?.coverImage);
    const DeletePrevCoverImage=await RemoveFromCloudinary(req.user?.coverImage)

    console.log("result of DeletePrevCoverImage",DeletePrevCoverImage);

    const coverImage=await UploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading on cloudinary")
    }

    const user=await User.findByIdAndUpdate(req.user?._id,{
        $set:{
            coverImage:coverImage.url
        }
    },{
        new:true
    }).select("-password")

    return res.status(200)
    .json(200,req.user,"coverImage updated successfully")
})

const getUserChannelProfile=asyncHandler(async(req,res)=>{

    const{username}=req.params;

    console.log("this is the username",username);


    if(!username?.trim()){
        throw new ApiError(400,"username is missing");
    }

    const channel=await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",//as name in mongodb converts to lower case and become plural
                foreignField:"channel",
                localField:"_id",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",//as name in mongodb converts to lower case and become plural
                foreignField:"subscriber",
                localField:"_id",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subsciberCount:{
                    $size:"$subscribers"
                },
                channelsSubscribedToCount:{
                    $size:"$subscribedTo"
                    },
                    isSubscribed:{
                        $cond:{
                            if:{$in:[req.user?._id,"$subscribers.subscriber"]},//it checks weather the user is subscribed to a channel or not .
                            then:true,
                            else:false
                        }
                    }
            }
        },
        {
            $project:{
                fullName:1,
                username:1,
                subsciberCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1,
            }
        }

])

if(!channel?.length){
    throw new ApiError(404,"channel does't exist");
}

return res.status(200)
.json(new ApiResponse(200,channel[0],"User channel fetched successfully"))//generally aggregation pipeline gives multiple objects
// in an array as result but as we have filtered out the individual user using username therefore there will be only 1 object inside array.
//that's why we have used channel[0] here.

})

const getWatchHistory=asyncHandler(async(req,res)=>{

    const user=await User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                        localField:"owner",
                        foreignField:"_id",
                        as:"owner",
                        pipeline:[
                            {
                                $project:{
                                    fullName:1,
                                    username:1,
                                    avatar:1
                                }
                            }
                        ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200).
    json(new ApiResponse(200,user[0].watchHistory,"watched History fetched successfully"));
})

export {registerUser,loginUser,
    logoutUser,refreshAccessToken,
    changeCurrentPassword,getCurrentUser,
    updateAccountDetails,updateUsersAvatar,
    updateUsersCoverImage,getUserChannelProfile,
    getWatchHistory}
