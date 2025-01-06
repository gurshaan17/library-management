import { Request, Response } from "express";
import prisma from "../config/database";

export const getMostBorrowedBooks = async (req: Request, res: Response) => {
  try {
    const mostBorrowedBooks = await prisma.borrowedBook.groupBy({
      by: ["bookId"],
      _count: {
        bookId: true,
      },
      orderBy: {
        _count: {
          bookId: "desc",
        },
      },
      take: 10,
    });

    const books = await Promise.all(
      mostBorrowedBooks.map(async (record) => {
        const book = await prisma.book.findUnique({
          where: { id: record.bookId },
          select: {
            id: true,
            title: true,
            isbn: true,
          },
        });
        return {
          ...book,
          borrowCount: record._count.bookId,
        };
      })
    );

    res.status(200).json(books);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const generateMonthlyUsageReport = async (req: Request, res: Response) => {
    try {
      const { month, year } = req.query;
      const currentDate = new Date();
      const targetMonth = parseInt(month as string) || currentDate.getMonth() + 1; 
      const targetYear = parseInt(year as string) || currentDate.getFullYear(); 
  
      const borrowedBooks = await prisma.borrowedBook.findMany({
        where: {
          borrowedAt: {
            gte: new Date(targetYear, targetMonth - 1, 1),
            lt: new Date(targetYear, targetMonth, 1), 
          },
        },
        include: {
          Book: {
            select: {
              id: true,
              title: true,
              isbn: true,
            },
          },
          User: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
  
      const totalBorrowed = borrowedBooks.length;
      const usersInvolved = new Set(borrowedBooks.map((record) => record.userId)).size;
  
      res.status(200).json({
        month: targetMonth,
        year: targetYear,
        totalBorrowed,
        usersInvolved,
        borrowedBooks,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };