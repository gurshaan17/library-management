import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes";
import bookRoutes from "./routes/bookRoutes";
import userRoutes from "./routes/userRoutes";
import borrowRoutes from "./routes/borrowRoutes";
import fineRoutes from "./routes/fineRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import analyticsRoutes from "./routes/analyticsRoutes"
import { errorHandler } from "./middlewares/errorMiddleware";

dotenv.config();

const app = express();

app.use(express.json());

app.use("/auth", authRoutes);
app.use("/books", bookRoutes);
app.use("/users", userRoutes);
app.use("/borrow", borrowRoutes);
app.use("/pay", paymentRoutes);
app.use("/fine", fineRoutes);
app.use("/analytics", analyticsRoutes);

app.use(errorHandler);

export default app;