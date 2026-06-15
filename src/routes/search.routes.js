// routes/searchRoutes.ts
import express from "express";
import { searchAll } from "../controllers/search.controller.js";
import { searchUsers } from "../controllers/search.controller.js";
import { verifyUserOptional } from "../middleware/verifyUserOptional.js";

const router = express.Router();

router.get("/",verifyUserOptional,searchAll);
router.get("/users", searchUsers);

export default router;
