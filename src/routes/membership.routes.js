import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { getMembershipStatus } from "../controllers/membership.controller.js";
import {getChannelMembers} from "../controllers/membership.controller.js";

const router=Router();

router.route("/status/:channelId").get(verifyJWT, getMembershipStatus);

router.route("/channel-members").get(verifyJWT, getChannelMembers);

export default router;
