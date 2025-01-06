import { Request, Response } from "express";
import prisma from "../config/database";

export const payFine = async (req: Request, res: Response) => {
  try {
    const { borrowedBookId, amount } = req.body;
    //@ts-ignore
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