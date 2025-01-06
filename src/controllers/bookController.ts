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