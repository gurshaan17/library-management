import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../config/database";

interface CustomRequest extends Request {
  user?: any; 
}

export const authenticate = async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  
  try {
    const payload: any = jwt.verify(token, process.env.JWT_SECRET!);
    const user = await prisma.user.findUnique({ where: { id: payload.id } });

    if (!user || !user.verified) {
      res.status(403).json({ error: "Email not verified" });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(403).json({ error: "Invalid token" });
    return;
  }
};

export const adminOnly = (req: CustomRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  next();
};