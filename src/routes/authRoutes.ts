import { Router } from "express";
import { login, register } from "../controllers/authController";

const router = Router();

router.post("/register", register);
//@ts-ignore
router.post("/login", login);

export default router;