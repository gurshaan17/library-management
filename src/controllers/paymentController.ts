import { Request, Response } from "express";
import prisma from "../config/database";

interface CustomRequest extends Request {
  user?: any; 
}

/**
 * @swagger
 * /pay:
 *   post:
 *     summary: Pay a fine for a borrowed book
 *     tags: [Payment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               borrowedBookId:
 *                 type: integer
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Fine paid successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 transaction:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     amount:
 *                       type: number
 *                     paymentDate:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid input or insufficient payment
 *       404:
 *         description: Borrowing record not found
 *       500:
 *         description: Internal server error
 */
export const payFine = async (req: CustomRequest, res: Response) => {
  try {
    const { borrowedBookId, amount } = req.body;
    const userId = req.user.id;
    const borrowedBook = await prisma.borrowedBook.findFirst({
      where: { id: borrowedBookId, userId },
    });
    if (!borrowedBook) {
      res.status(404).json({ error: "Borrowing record not found." });
      return;
    }
    if (borrowedBook.fine <= 0) {
      res.status(400).json({ error: "No fines to pay for this record." });
      return;
    }
    if (amount < borrowedBook.fine) {
      res.status(400).json({ error: `Insufficient payment. Fine is ${borrowedBook.fine}.` });
      return;
    }
    await prisma.borrowedBook.update({
      where: { id: borrowedBookId },
      data: { fine: 0 },
    });

    //@ts-ignore
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        borrowedBookId,
        amount,
        paymentDate: new Date(),
      },
    });

    res.status(200).json({
      message: "Fine paid successfully.",
      transaction,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * @swagger
 * /invoice/{id}:
 *   get:
 *     summary: Generate an invoice for a transaction
 *     tags: [Payment]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the transaction to generate an invoice for
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Invoice generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transactionId:
 *                   type: integer
 *                 user:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                 book:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     isbn:
 *                       type: string
 *                 amount:
 *                   type: number
 *                 paymentDate:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid transaction ID
 *       404:
 *         description: Transaction not found
 *       500:
 *         description: Internal server error
 */
export const generateInvoice = async (req: Request, res: Response) => {
    try {
      const transactionId = parseInt(req.params.id);
      if (isNaN(transactionId)) {
        res.status(400).json({ error: "Invalid transaction ID." });
      }
      //@ts-ignore
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: {
          BorrowedBook: {
            include: {
              Book: { select: { title: true, isbn: true } },
            },
          },
          User: { select: { name: true, email: true } },
        },
      });
  
      if (!transaction) {
        res.status(404).json({ error: "Transaction not found." });
      }
      const invoice = {
        transactionId: transaction.id,
        user: transaction.User,
        book: transaction.BorrowedBook?.Book,
        amount: transaction.amount,
        paymentDate: transaction.paymentDate,
      };
  
      res.status(200).json(invoice);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
};