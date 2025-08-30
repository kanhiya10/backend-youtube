import { Router } from "express";
import { toggleSubscription,getMySubscriptions } from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router=Router();

router.route("/toggle/:channelId").post(verifyJWT,toggleSubscription);

router.route("/user").get(verifyJWT,getMySubscriptions);

export default router;