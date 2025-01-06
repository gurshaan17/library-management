import { Request, Response, NextFunction } from "express";
import redisClient from "../config/redis";

export const cacheMiddleware = (keyPrefix: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cacheKey = `${keyPrefix}:${JSON.stringify(req.params || req.query)}`;
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        console.log(`Cache hit for key: ${cacheKey}`);
        res.status(200).json(JSON.parse(cachedData)); 
        return;
      }

      console.log(`Cache miss for key: ${cacheKey}`);
      res.locals.cacheKey = cacheKey; 
      next(); 
    } catch (err: any) {
      console.error("Error accessing Redis cache", err);
      next();
    }
  };
};