import { Request, Response } from "express";
import prisma from "../config/database";

export const getUserDetails = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)){
        res.status(400).json({ error: "Invalid user ID" });
        return;
    }
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        verified: true,
        deletedAt: true,
      },
    });
    if (!user){
        res.status(404).json({ error: "User not found" });
        return;
    }
    res.status(200).json(user);
    return;
  } catch (err: any) {
    res.status(500).json({ error: err.message });
    return;
  }
};


export const trackBorrowedBooksAndFines = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: "Invalid user ID" });
        return;
      }
      const borrowedBooks = await prisma.borrowedBook.findMany({
        where: { userId: id, returnedAt: null }, 
        include: {
          Book: {
            select: { title: true, isbn: true },
          },
        },
      });
      const fines = borrowedBooks.reduce((total, book) => {
        const overdueDays = Math.max(
          0,
          Math.floor((new Date().getTime() - new Date(book.dueDate).getTime()) / (1000 * 60 * 60 * 24))
        );
        return total + overdueDays;
      }, 0);
      res.status(200).json({ borrowedBooks, totalFine: fines });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
};


  export const enableDisableUserAccount = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: "Invalid user ID" });
        return;
      }
  
      const { disabled } = req.body;
      if (typeof disabled !== "boolean") {
        res.status(400).json({ error: "Invalid value for 'disabled'" });
        return;
      }
  
      const user = await prisma.user.update({
        where: { id },
        data: { deletedAt: disabled ? new Date() : null },
      });
  
      res.status(200).json({
        message: `User account has been ${disabled ? "disabled" : "enabled"}`,
        user,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
};