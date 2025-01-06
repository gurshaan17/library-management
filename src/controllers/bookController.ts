import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../config/database";

const addBookSchema = z.object({
  title: z.string(),
  isbn: z.string(),
  copies: z.number().int().positive(),
  authors: z.array(z.string()),
  categories: z.array(z.string()),
});

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

export const getBookDetails = async (req: Request, res: Response) => {
  try {
    const { isbnOrTitle } = req.params;

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

    if (!book)  res.status(404).json({ error: "Book not found" });

    res.status(200).json(book);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

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