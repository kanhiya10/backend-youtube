import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {createOrderId} from "../controllers/payment.controller.js";
import {verifyPayment} from "../controllers/payment.controller.js";
import {failPayment} from "../controllers/payment.controller.js";

const router=Router();

router.route("/createOrderId").post(verifyJWT,createOrderId);

router.route("/verify").post(verifyJWT,verifyPayment);

router.route("/fail").post(verifyJWT,failPayment);

export default router;
