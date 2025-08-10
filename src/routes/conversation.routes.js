import express from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";
import { getConversations,getConversationBetween,getMessages,getUnreadCount,MediaFileUpload } from "../controllers/conversation.controller.js";

const router = express.Router();

router.get("/", verifyJWT, getConversations);
router.post("/uploadMedia",verifyJWT,upload.single("mediaFile"), MediaFileUpload);
router.get("/between/:userId", verifyJWT, getConversationBetween);
router.get("/:conversationId/messages", verifyJWT, getMessages);
router.get("/unread-count", verifyJWT, getUnreadCount);

export default router;