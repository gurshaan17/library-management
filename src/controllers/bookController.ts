import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../config/database";
import redisClient from "../config/redis";

const addBookSchema = z.object({
  title: z.string(),
  isbn: z.string(),
  copies: z.number().int().positive(),
  authors: z.array(z.string()),
  categories: z.array(z.string()),
});

/**
 * @swagger
 * /books:
 *   post:
 *     summary: Add a new book
 *     tags: [Books]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               isbn:
 *                 type: string
 *               copies:
 *                 type: integer
 *               authors:
 *                 type: array
 *                 items:
 *                   type: string
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Book added successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal server error
 */
export const addBook = async (req: Request, res: Response) => {
  try {
    const data = addBookSchema.parse(req.body);
    const book = await prisma.book.create({
      data: {
        title: data.title,
        isbn: data.isbn,
        copies: data.copies,
        Authors: {
          //@ts-ignore
          create: data.authors.map((name) => ({
            Author: { 
              connectOrCreate: { 
                where: { name },
                create: { name } 
              } 
            },
          })),
        },
        Categories: {
          //@ts-ignore
          create: data.categories.map((name) => ({
            Category: { 
              connectOrCreate: { 
                where: { name },
                create: { name } 
              } 
            },
          })),
        },
      },
    });
    res.status(201).json(book);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

const editBookSchema = z.object({
  title: z.string().optional(),
  isbn: z.string().optional(),
  copies: z.number().int().positive().optional(),
  authors: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
});

/**
 * @swagger
 * /books/{id}:
 *   put:
 *     summary: Edit an existing book
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the book to edit
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               isbn:
 *                 type: string
 *               copies:
 *                 type: integer
 *               authors:
 *                 type: array
 *                 items:
 *                   type: string
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Book updated successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Book not found
 *       500:
 *         description: Internal server error
 */
export const editBook = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) res.status(400).json({ error: "Invalid book ID" });

    const data = editBookSchema.parse(req.body);

    const book = await prisma.book.update({
      where: { id },
      data: {
        ...data,
        Authors: data.authors
          ? {
              deleteMany: {},
              create: data.authors.map((name) => ({
                Author: { 
                  connectOrCreate: { 
                    where: { name },
                    create: { name } 
                  } 
                },
              })),
            }
          : undefined,
        Categories: data.categories
          ? {
              deleteMany: {},
              create: data.categories.map((name) => ({
                Category: { 
                  connectOrCreate: { 
                    where: { name },
                    create: { name } 
                  } 
                },
              })),
            }
          : undefined,
      },
    });

    res.status(200).json(book);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * @swagger
 * /books/{id}:
 *   delete:
 *     summary: Delete a book
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the book to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Book deleted successfully
 *       404:
 *         description: Book not found
 *       500:
 *         description: Internal server error
 */
export const deleteBook = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) res.status(400).json({ error: "Invalid book ID" });

    await prisma.book.update({
      where: { id },
      data: { deletedAt: new Date() }, // Soft delete
    });

    res.status(200).json({ message: "Book deleted successfully" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * @swagger
 * /books/{isbnOrTitle}:
 *   get:
 *     summary: Get details of a book by ISBN or title
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: isbnOrTitle
 *         required: true
 *         description: ISBN or title of the book to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Book details retrieved successfully
 *       404:
 *         description: Book not found
 *       500:
 *         description: Internal server error
 */
export const getBookDetails = async (req: Request, res: Response) => {
  const { isbnOrTitle } = req.params;

  const cacheKey = `bookDetails:${JSON.stringify({ isbnOrTitle })}`;
  const cachedData = await redisClient.get(cacheKey);

  if (cachedData) {
    res.status(200).json(JSON.parse(cachedData));
    return;
  }

  try {
    const book = await prisma.book.findFirst({
      where: {
        OR: [
          { isbn: isbnOrTitle },
          { title: { contains: isbnOrTitle, mode: "insensitive" } },
        ],
        deletedAt: null,
      },
      include: {
        Authors: { include: { Author: true } },
        Categories: { include: { Category: true } },
      },
    });

    if (!book){
      res.status(404).json({ error: "Book not found" });
      return;
    }

    await redisClient.set(cacheKey, JSON.stringify(book), {
      EX: 3600,
    });

    res.status(200).json(book);
    return;
  } catch (err: any) {
    res.status(500).json({ error: err.message });
    return;
  }
};

/**
 * @swagger
 * /books/search:
 *   get:
 *     summary: Search for books
 *     tags: [Books]
 *     parameters:
 *       - in: query
 *         name: category
 *         required: false
 *         description: Category to filter books
 *         schema:
 *           type: string
 *       - in: query
 *         name: author
 *         required: false
 *         description: Author to filter books
 *         schema:
 *           type: string
 *       - in: query
 *         name: available
 *         required: false
 *         description: Filter for available books
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of books matching the search criteria
 *       500:
 *         description: Internal server error
 */
export const searchBooks = async (req: Request, res: Response) => {
  try {
    const { category, author, available } = req.query;

    const books = await prisma.book.findMany({
      where: {
        AND: [
          available
            ? { copies: { gt: 0 } }
            : {},
          category
            ? {
                Categories: {
                  some: {
                    Category: { name: { contains: String(category), mode: "insensitive" } },
                  },
                },
              }
            : {},
          author
            ? {
                Authors: {
                  some: {
                    Author: { name: { contains: String(author), mode: "insensitive" } },
                  },
                },
              }
            : {},
        ],
        deletedAt: null,
      },
      include: {
        Authors: { include: { Author: true } },
        Categories: { include: { Category: true } },
      },
    });

    res.status(200).json(books);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};