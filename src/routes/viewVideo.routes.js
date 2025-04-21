import { Router } from "express";
import viewVideo from "../controllers/viewVideo.controller.js";

const router = Router();

router.route("/viewVideo/:videoId").post(viewVideo);

export default router;
