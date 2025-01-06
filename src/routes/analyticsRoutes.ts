import { Router } from "express";
import { authenticate, adminOnly } from "../middlewares/authMiddleware";
import { generateMonthlyUsageReport, getMostBorrowedBooks } from "../controllers/analyticsController";

const router = Router();

router.get("/most-borrowed", authenticate, adminOnly, getMostBorrowedBooks);
router.get("/monthly-report", authenticate, adminOnly, generateMonthlyUsageReport);

export default router;