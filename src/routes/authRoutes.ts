import { Router } from "express";
import { register, login, verifyEmail } from "../controllers/authController";

const router = Router();

router.post("/register", register);
//@ts-ignore
router.post("/login", login);
//@ts-ignore
router.get("/verify-email", verifyEmail);

export default router;