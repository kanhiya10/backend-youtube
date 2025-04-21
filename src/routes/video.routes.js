import { Router } from "express";

import {upload} from "../middleware/multer.middleware.js";

import { verifyJWT } from "../middleware/auth.middleware.js";

import { uploadVideo,handleGetVideos,randomVideos,videoOwnerInfo,toggleReaction } from "../controllers/video.controller.js";


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

router.route("/handleGetVideos/:id").post(verifyJWT,handleGetVideos)

router.route("/randomVideos").get(randomVideos)

router.route("/videoOwnerInfo/:id").get(videoOwnerInfo)

router.route('/toggleReaction/:videoId').post(verifyJWT,toggleReaction);


export default router; 