import { Router } from "express";
import { addBook } from "../controllers/bookController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

//@ts-ignore
router.post("/", authenticate, addBook);

export default router;