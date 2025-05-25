import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { createComment, getCommentsByVideo,replyToComment,toggleCommentLike,toggleCommentDislike } from "../controllers/comment.controller.js";


const router=Router();

router.route("/writeComment").post(verifyJWT, createComment);
router.route("/:parentCommentId/reply").post(verifyJWT, replyToComment); // this MUST come before
router.route("/readComment/:videoId").get(getCommentsByVideo);
router.route("/like/:commentId").post(verifyJWT, toggleCommentLike);
router.route("/dislike/:commentId").post(verifyJWT, toggleCommentDislike);



export default router;
