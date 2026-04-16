import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
// import { Subscription } from "../models/subscription.model.js";
import { RemoveFromCloudinary, UploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { OAuth2Client } from "google-auth-library";
import { refreshToken } from "firebase-admin/app";
// import { trusted } from "mongoose";

const client = new OAuth2Client(process.env.clientId);

const generateAccessAndRefereshToken=async(userId)=>{
    try{
        const user=await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave: false})//by setting false mongoose will bypass the validation process before saving

        return {accessToken,refreshToken}
    }
    catch(error){
        throw new ApiError(500,"Something went wrong while generating access and refresh token")
    }
}

const googleLogin = asyncHandler(async (req, res) => {

  const { idToken } = req.body;

  const ticket = await client.verifyIdToken({
    idToken,
    
  });

  const payload = ticket.getPayload();
  const { email, name, picture } = payload;

  let user = await User.findOne({ email });

 const defaultCoverImage="https://res.cloudinary.com/dl2eospm1/image/upload/v1750020129/default_akok6c.jpg";

  if (!user) {
    user = await User.create({
      fullName: name,
      email,
      username: email.split('@')[0],
      avatar: picture,
      coverImage: defaultCoverImage, // Set a default cover image
      description: "Google user",
      authProvider: "google",
      password: "google_oauth", // dummy password
    });
  }

  const { accessToken, refreshToken } = await generateAccessAndRefereshToken(user._id);

   user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  };


  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, {
        user: loggedInUser,
        accessToken,
        refreshToken,
      }, "Google login successful")
    );
});



const registerUser=asyncHandler(async(req,res)=>{
    // res.status(200).json({
    //     message:'yes'
    // })

    const {fullName,username,email,password,description}=req.body;


if(
    [fullName,email,username,password,description].some((field)=>field?.trim()==="")
){
    throw new ApiError(400,"All fields are required")
}

const existedUser=await User.findOne({
    $or :[{email},{username}]
})

if(existedUser){
    throw new ApiError(409,"User with email or username already exists")
}

const avatarLocalPath=req.files?.avatar[0]?.path;//req.files containes the files to be uploaded ,set throught multer middleaware
// const coverImageLocalPath=req.files?.coverImage[0]?.path;

let coverImageLocalPath;

if(req.files && Array.isArray(req.files.coverImage)&& req.files.coverImage.length>0){
    coverImageLocalPath=req.files.coverImage[0].path;
}

if(!avatarLocalPath){
    throw new ApiError(400,"Avatar file is required");
}

const avatar = await UploadOnCloudinary(avatarLocalPath, [
  { width: 200, height: 200, crop: 'thumb', gravity: 'face' }
]);

const coverImage = await UploadOnCloudinary(coverImageLocalPath, [
  { width: 1200, height: 400, crop: 'fill', gravity: 'auto' }
]);


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
    description,
    password,
    username:username.toLowerCase()
})


// const Channel=await Subscription.create({
//     channel:user._id,
// })
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



      if (user.authProvider === "google") {
    throw new ApiError(403, "Please login using Google Sign-In");
  }

    const isPasswordValid=await user.isPasswordCorrect(password);//checks for the password saved in record


    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials");
    }

    const{accessToken,refreshToken}=await generateAccessAndRefereshToken(user._id)

    const loggedInUser=await User.findById(user._id).select("-password -refreshToken")//select is used to exclude values

    // const options={
    //     httpOnly: true,      // Ensures the cookie is only accessible by the web server
    //     secure: false,       // Set to true if you're using HTTPS; false for localhost
    //     sameSite: 'Lax',      // Controls when cookies are sent with cross-site requests
    // }/
    const options={
        httpOnly: true,      
        secure: true,      
        sameSite: 'none',     
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
                refreshToken:1//this removes the field from document.
            }
        },
        {
            new:true
        }
    )


    // for production purpose only
    const options={
        httpOnly: true,      
        secure: true,      
        sameSite: 'none',     
    }

    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged Out"))
    

})

const refreshAccessToken=asyncHandler(async(req,res)=>{


    const incomingRefreshToken=req.cookies?.refreshToken || req.body.refreshToken
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
    
        const accessToken=await user.generateAccessToken();


        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .json(
            new ApiResponse(200,{
                accessToken,refreshToken:incomingRefreshToken
            },
        "access token refreshed successfully.")
        )
    
    
    } catch (error) {
        throw new ApiError(401,error?.message||"Invalid Refresh Token")
    }

})

const changeCurrentPassword=asyncHandler(async(req,res)=>{

    const{currentPassword,newPassword}=req.body;

    const user=await User.findById(req.user?._id)


    if(!user){
        throw new ApiError(404,"user does't exist") 
    }
    if(!currentPassword || !newPassword){
        throw new ApiError(400,"All fields are required")   
    }

    const isPasswordValid=await user.isPasswordCorrect(currentPassword)

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

    const DeletePrevCoverImage=await RemoveFromCloudinary(req.user?.coverImage)


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



const setWatchHistory=asyncHandler(async(req,res)=>{

    const userId=req.user._id;
    const{videoId}=req.params;

   
        const user = await User.findById(userId);
        if (user) {
            user.watchHistory.push(videoId);
            await user.save();
        } else {
        }
    

    

   return res.status(200).json({ message: 'Video added to watch history' });
})

const getWatchHistory=asyncHandler(async(req,res)=>{

    const userId=req.user._id;
    try {
        // Find the user by ID and populate the watchHistory field
        const user = await User.findById(userId).populate({
            path: 'watchHistory',
            options: { limit: 10, sort: { createdAt: -1 } },
            select: " _id title videoFile description thumbnail createdAt views duration", // Select only necessary fields
          });
          
    
        if (!user) {
          return;
        }
        

    
    
        // The user.watchHistory will now contain an array of full Video documents
        return res.status(200)
        .json(new ApiResponse(200,user.watchHistory,"current user watch History fetched"));
  
       
      } catch (error) {
        console.error('Error fetching watch history:', error);
      }

     
})

const ClearHistory=asyncHandler(async(req,res)=>{
    const userId=req.user._id;

    try{
        const user=await User.findByIdAndUpdate(userId,{
            $set:{
                watchHistory:[]
            }
        },{
            new:true
        });

        return res.status(200)
        .json(new ApiResponse(200,user.watchHistory,"current user watch History cleared"));
    }
    catch(error){
        console.error('Error fetching watch history:', error);
    }
})

const visitChannel=asyncHandler(async(req,res)=>{
    const{username}=req.params;



    if(!username?.trim()){
        throw new ApiError(400,"username is missing");
    }

    const visitingUser=await User.findOne({
        username:username
    })

if(!visitingUser){
    throw new ApiError(404,"visiting user does't exist");
}

return res.status(200)
.json(new ApiResponse(200,visitingUser,"User channel fetched successfully"))//generally aggregation pipeline gives multiple objects
// in an array as result but as we have filtered out the individual user using username therefore there will be only 1 object inside array.
//that's why we have used channel[0] here.

})

export {registerUser,loginUser,
    logoutUser,refreshAccessToken,
    changeCurrentPassword,getCurrentUser,
    updateAccountDetails,updateUsersAvatar,
    updateUsersCoverImage,
    setWatchHistory,visitChannel,getWatchHistory,ClearHistory,googleLogin}
