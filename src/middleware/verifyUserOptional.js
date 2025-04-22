// backend/middlewares/verifyUserOptional.js

import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js"

export const verifyUserOptional = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return next(); // No token? Proceed without attaching user
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

    if (user) {
      req.user = user;
    }
  } catch (error) {
    // If token is invalid, just skip user assignment
  }

  next(); // Always move to next middleware
};
