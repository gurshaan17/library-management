import { Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../config/database";
import { sendEmail } from "../config/email";

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

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, {
      expiresIn: "1d",
    });
    res.status(200).json({ token });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    if (Array.isArray(token)) {
      return res.status(400).json({ error: "Invalid verification token" });
    }

    if (typeof token !== "string") {
      return res.status(400).json({ error: "Invalid verification token" });
    }
    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
    });
    if (!user) {
      return res.status(400).json({ error: "Invalid or expired token" });
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