import { Router } from "express";
import {
  addBook,
  editBook,
  deleteBook,
  getBookDetails,
  searchBooks,
} from "../controllers/bookController";
import { adminOnly, authenticate } from "../middlewares/authMiddleware";

const router = Router();


router.get("/:isbnOrTitle", getBookDetails);
router.get("/", searchBooks);
router.post("/", authenticate, adminOnly, addBook);
router.put("/:id", authenticate, adminOnly, editBook);
router.delete("/:id", authenticate, adminOnly, deleteBook);

export default router;