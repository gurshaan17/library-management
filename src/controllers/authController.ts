import { Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../config/database";
import { sendEmail } from "../config/email";

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               role:
 *                 type: string
 *                 enum: [admin, member]
 *     responses:
 *       201:
 *         description: User registered successfully. Verification email sent.
 *       400:
 *         description: Invalid input data.
 */
const registerSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "member"]),
});

export const register = async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const user = await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
        verificationToken,
      },
    });
    const verificationUrl = `${process.env.BASE_URL}/auth/verify-email?token=${verificationToken}`;
    await sendEmail(
      user.email,
      "Verify your email",
      `Click the link to verify your email: ${verificationUrl}`
    );

    res.status(201).json({
      message: "User registered. Please verify your email.",
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User logged in successfully. Returns a JWT token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       404:
 *         description: User not found.
 *       401:
 *         description: Invalid credentials.
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, {
      expiresIn: "1d",
    });
    res.status(200).json({ token });
    return;
  } catch (err: any) {
    res.status(400).json({ error: err.message });
    return;
  }
};

/**
 * @swagger
 * /auth/verify-email:
 *   get:
 *     summary: Verify user email
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         description: Verification token sent to the user's email
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email verified successfully.
 *       400:
 *         description: Invalid or expired token.
 *       500:
 *         description: Internal server error.
 */
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    if (Array.isArray(token)) {
      res.status(400).json({ error: "Invalid verification token" });
      return;
    }

    if (typeof token !== "string") {
      res.status(400).json({ error: "Invalid verification token" });
      return;
    }
    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
    });
    if (!user) {
      res.status(400).json({ error: "Invalid or expired token" });
      return;
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { verified: true, verificationToken: null },
    });
    res.status(200).json({ message: "Email verified successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};