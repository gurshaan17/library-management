import { Request, Response } from "express";
import prisma from "../config/database";

interface CustomRequest extends Request {
  user?: any; 
}

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user details
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the user to retrieve
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *                 verified:
 *                   type: boolean
 *       404:
 *         description: User not found
 */
export const getUserDetails = async (req: CustomRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user?.id;
    if (userId !== id) {
      res.status(403).json({ error: "Access denied: You can only access your own data." });
      return;
    }
    if (isNaN(id)) {
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

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.status(200).json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * @swagger
 * /users/{id}/borrowed-books:
 *   get:
 *     summary: Get borrowed books and fines for a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the user to retrieve borrowed books for
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of borrowed books and total fines
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 borrowedBooks:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       dueDate:
 *                         type: string
 *                         format: date
 *                 totalFine:
 *                   type: integer
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 */
export const trackBorrowedBooksAndFines = async (req: CustomRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user?.id;

    if (userId !== id) {
      res.status(403).json({ error: "Access denied: You can only access your own borrowed books." });
      return;
    }

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

/**
 * @swagger
 * /users/{id}/enable-disable:
 *   patch:
 *     summary: Enable or disable a user account
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the user to enable or disable
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               disabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User account status updated successfully
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 */
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