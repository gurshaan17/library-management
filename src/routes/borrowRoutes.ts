import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import { borrowBook, checkBorrowingLimit, returnBook } from "../controllers/borrowController";

const router = Router();
router.post("/", authenticate, borrowBook);
router.post("/return", authenticate, returnBook);
router.get("/limit", authenticate, checkBorrowingLimit);

export default router;