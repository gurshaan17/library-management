import { Router } from "express";
import {
  getUserDetails,
  trackBorrowedBooksAndFines,
  enableDisableUserAccount,
} from "../controllers/userController";
import { authenticate, adminOnly } from "../middlewares/authMiddleware";

const router = Router();

router.get("/:id", authenticate, getUserDetails);
router.get("/:id/borrowed-books", authenticate, trackBorrowedBooksAndFines);
router.patch("/:id/enable-disable", authenticate, adminOnly, enableDisableUserAccount);

export default router;