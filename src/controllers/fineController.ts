import { Request, Response } from "express";
import prisma from "../config/database";

export const calculateFine = async (req: Request, res: Response) => {
  try {
    const borrowedBookId = parseInt(req.params.borrowedBookId);
    if (isNaN(borrowedBookId)) {
      res.status(400).json({ error: "Invalid borrowed book ID." });
    }

    const borrowedBook = await prisma.borrowedBook.findUnique({
      where: { id: borrowedBookId },
    });

    if (!borrowedBook) {
      res.status(404).json({ error: "Borrowed book not found." });
      return;
    }

    if (borrowedBook.returnedAt) {
      res.status(200).json({ fine: 0, message: "Book has already been returned." });
    }

    const now = new Date();
    const dueDate = new Date(borrowedBook.dueDate);
    const overdueDays = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
    const fine = overdueDays;

    res.status(200).json({ overdueDays, fine });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getTotalFine = async (req: Request, res: Response) => {
    try {
      //@ts-ignore
      const userId = req.user.id;
      const borrowedBooks = await prisma.borrowedBook.findMany({
        where: { userId, returnedAt: null },
      });
      const now = new Date();
      const totalFine = borrowedBooks.reduce((total, book) => {
        const dueDate = new Date(book.dueDate);
        const overdueDays = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
        return total + overdueDays;
      }, 0);
      res.status(200).json({ totalFine });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };