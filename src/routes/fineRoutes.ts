import { Router } from "express";
import { calculateFine, getTotalFine } from "../controllers/fineController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();
router.get("/calculate/:borrowedBookId", authenticate, calculateFine);
router.get("/total", authenticate, getTotalFine);

export default router;