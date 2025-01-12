import { Request, Response } from "express";
import prisma from "../config/database";

/**
 * @swagger
 * /borrow:
 *   post:
 *     summary: Borrow a book
 *     tags: [Borrow]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bookId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Book borrowed successfully
 *       400:
 *         description: Borrowing limit reached or book not available
 *       404:
 *         description: Book not found
 *       500:
 *         description: Internal server error
 */
export const borrowBook = async (req: Request, res: Response) => {
  try {
    const { bookId } = req.body;
    //@ts-ignore
    const userId = req.user?.id;
    const borrowedCount = await prisma.borrowedBook.count({
      where: { userId, returnedAt: null },
    });
    if (borrowedCount >= 3) {
      res.status(400).json({ error: "Borrowing limit reached. Return a book to borrow another." });
    }
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book || book.copies <= 0) {
      res.status(404).json({ error: "Book not available." });
    }

    await prisma.borrowedBook.create({
      data: {
        userId,
        bookId,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.book.update({
      where: { id: bookId },
      data: { copies: { decrement: 1 } },
    });

    res.status(200).json({ message: "Book borrowed successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * @swagger
 * /borrow/return:
 *   post:
 *     summary: Return a borrowed book
 *     tags: [Borrow]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bookId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Book returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 fine:
 *                   type: number
 *       404:
 *         description: Borrowing record not found
 *       500:
 *         description: Internal server error
 */
export const returnBook = async (req: Request, res: Response) => {
    try {
      const { bookId } = req.body;
      //@ts-ignore
      const userId = req.user?.id;
      const borrowedBook = await prisma.borrowedBook.findFirst({
        where: { userId, bookId, returnedAt: null },
      });
      if (!borrowedBook) {
        res.status(404).json({ error: "Borrowing record not found." });
        return;
      }
      const now = new Date();
      const dueDate = new Date(borrowedBook.dueDate);
      const overdueDays = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
      const fine = overdueDays * 1;
      await prisma.borrowedBook.update({
        where: { id: borrowedBook.id },
        data: { returnedAt: now, fine },
      });
      await prisma.book.update({
        where: { id: bookId },
        data: { copies: { increment: 1 } },
      });
  
      res.status(200).json({ message: "Book returned successfully.", fine });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
};

/**
 * @swagger
 * /borrow/limit:
 *   get:
 *     summary: Check the borrowing limit for the authenticated user
 *     tags: [Borrow]
 *     responses:
 *       200:
 *         description: Borrowing limit retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 borrowingLimit:
 *                   type: integer
 *                 borrowedCount:
 *                   type: integer
 *                 remaining:
 *                   type: integer
 *       500:
 *         description: Internal server error
 */
export const checkBorrowingLimit = async (req: Request, res: Response) => {
    try {
        //@ts-ignore
    const userId = req.user?.id;
    const borrowedCount = await prisma.borrowedBook.count({
        where: { userId, returnedAt: null },
    });
  
    res.status(200).json({
        borrowingLimit: 3,
        borrowedCount,
        remaining: Math.max(0, 3 - borrowedCount),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
};