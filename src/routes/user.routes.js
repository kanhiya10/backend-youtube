import { Router } from "express";

import { logoutUser,loginUser,registerUser,refreshAccessToken, changeCurrentPassword, 
    getCurrentUser, updateAccountDetails, updateUsersAvatar, updateUsersCoverImage, 
 setWatchHistory,visitChannel,getWatchHistory,ClearHistory } from "../controllers/user.controller.js";
import {upload} from "../middleware/multer.middleware.js";

import { verifyJWT } from "../middleware/auth.middleware.js";

// import { uploadVideo,handleGetVideos } from "../controllers/video.controller.js";

const router=Router();

router.route("/register").post(
    upload.fields([       // 1st middleware
        {
            name:'avatar',
            maxCount:1
        },
        {
            name:'coverImage',
            maxCount:1
        }
    ]),
    registerUser          // 2nd middleware
);

router.route("/login").post(loginUser)

router.route("/logout").post(verifyJWT,logoutUser)//here verifyJWT is used to get cookies to verify user.
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT,changeCurrentPassword)
router.route("/current-user").get(verifyJWT,getCurrentUser)
router.route("/update-account").patch(verifyJWT,updateAccountDetails)
router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateUsersAvatar)//verifyJWT
router.route("/cover-image").patch(verifyJWT,upload.single("coverImage"),updateUsersCoverImage)
// router.route("/channel/:username").get(verifyJWT,getUserChannelProfile)
router.route("/history/:userId/:videoId").post(verifyJWT, setWatchHistory);
router.route("/GetHistory/:userId").get(verifyJWT, getWatchHistory);
router.route("/ClearHistory/:userId").get(verifyJWT, ClearHistory);
// router.route("/testing").get(testing)
router.route("/visitChannel/:username").post(visitChannel)

// router.route("/uploadVideo").post(verifyJWT,upload.fields([
//     {
//         name:'video',
//         maxCount:1
//     },
//     {
//         name:'thumbnail',
//         maxCount:1
//     }
// ])
//     ,uploadVideo)

// router.route("/handleGetVideos").get(verifyJWT,handleGetVideos)


export default router; 