import { Router } from "express";

import {upload} from "../middleware/multer.middleware.js";

import { verifyJWT } from "../middleware/auth.middleware.js";

import { uploadVideo,getVideosByUsername,randomVideos,videoOwnerInfo,toggleReaction,getSingleVideoById,deleteVideo } from "../controllers/video.controller.js";
import { verifyUserOptional } from "../middleware/verifyUserOptional.js";


const router=Router();

router.route("/uploadVideo").post(verifyJWT,upload.fields([
    {
        name:'video',
        maxCount:1
    },
    {
        name:'thumbnail',
        maxCount:1
    }
])
    ,uploadVideo)

// router.route("/handleGetVideos/:id").post(verifyJWT,handleGetVideos)

router.route("/user").get(verifyJWT, getVideosByUsername);
router.route("/user/:username").get(verifyUserOptional,getVideosByUsername);


router.route("/randomVideos").get(randomVideos)

router.route("/videoOwnerInfo/:id").get(verifyUserOptional,videoOwnerInfo)

router.route('/toggleReaction/:videoId').post(verifyJWT,toggleReaction);

router.route("/getSingleVideo/:id").get(getSingleVideoById);

router.route("/delete/:id").delete(verifyJWT,deleteVideo);


export default router; 