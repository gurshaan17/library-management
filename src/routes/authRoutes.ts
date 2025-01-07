import { Router } from "express";
import { register, login, verifyEmail } from "../controllers/authController";
import { authRateLimiter } from "../middlewares/rateLimitMiddleware";

const router = Router();

router.post("/register", authRateLimiter ,register);
router.post("/login", authRateLimiter, login);
router.get("/verify-email", authRateLimiter, verifyEmail);

export default router;