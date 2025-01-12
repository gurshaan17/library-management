import { WebSocketServer } from "ws";
import prisma from "../config/database";

const wss = new WebSocketServer({ noServer: true });

const clients: Set<WebSocket> = new Set();

wss.on("connection", (ws) => {
  console.log("Client connected");
  //@ts-ignore
  clients.add(ws);

  ws.on("close", () => {
    console.log("Client disconnected");
    //@ts-ignore
    clients.delete(ws);
  });
});

export const broadcastNotification = (message: string) => {
  clients.forEach((ws) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(message);
    }
  });
};

export const sendDueNotifications = async () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const dueTomorrowBooks = await prisma.borrowedBook.findMany({
    where: {
      returnedAt: null,
      dueDate: {
        gte: now,
        lte: tomorrow,
      },
    },
    include: {
      User: { select: { name: true } },
      Book: { select: { title: true } },
    },
  });

  dueTomorrowBooks.forEach((record) => {
    const message = `Reminder: The book "${record.Book.title}" is due tomorrow.`;
    broadcastNotification(message);
  });
};

export const sendOverdueNotifications = async () => {
  const now = new Date();

  const overdueBooks = await prisma.borrowedBook.findMany({
    where: {
      returnedAt: null,
      dueDate: {
        lt: now,
      },
    },
    include: {
      User: { select: { name: true } },
      Book: { select: { title: true } },
    },
  });

  overdueBooks.forEach((record: any) => {
    const message = `Overdue Alert: The book "${record.Book.title}" is overdue. Please return it to avoid further fines.`;
    broadcastNotification(message);
  });
};

export default wss;