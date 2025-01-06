import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes";
import bookRoutes from "./routes/bookRoutes";
import { errorHandler } from "./middlewares/errorMiddleware";

dotenv.config();

const app = express();

app.use(express.json());

app.use("/auth", authRoutes);
app.use("/books", bookRoutes);

app.use(errorHandler);

export default app;