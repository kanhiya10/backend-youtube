import { Router } from "express";
import { toggleSubscription } from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router=Router();

router.route("/toggle/:channelId").post(verifyJWT,toggleSubscription);

export default router;