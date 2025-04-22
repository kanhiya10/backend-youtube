import { Router } from "express";
import { startStream, getStreamByUsername, stopStream, getPastStreamsByUsername } from "../controllers/stream.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { verifyUserOptional } from "../middleware/verifyUserOptional.js";

const router=Router();

router.route("/start").post(verifyJWT,startStream);
router.route("/fetchLive/:username").get(getStreamByUsername);
router.route("/stop").post(verifyJWT, stopStream);
router.route("/history").get(verifyJWT, getPastStreamsByUsername);
router.route("/history/:username").get(getPastStreamsByUsername);




export default router;  