import { ApiError } from "../utils/ApiError.js";

export const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return next(new ApiError(403, "Forbidden: Admins only"));
  }
  next();
};
