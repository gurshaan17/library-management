import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import { generateInvoice, payFine } from "../controllers/paymentController";

const router = Router();

router.post("/pay", authenticate, payFine);
router.get("/invoice/:id", authenticate, generateInvoice);

export default router;