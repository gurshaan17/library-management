import cron from "node-cron";
import prisma from "../config/database";
import { sendEmail } from "../config/email";

const sendReturnReminders = async () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1); 

  const overdue = new Date(now);
  overdue.setDate(now.getDate() - 1); 

  const dueTomorrowBooks = await prisma.borrowedBook.findMany({
    where: {
      returnedAt: null,
      dueDate: {
        gte: now,
        lte: tomorrow,
      },
    },
    include: {
      User: {
        select: { email: true, name: true },
      },
      Book: {
        select: { title: true },
      },
    },
  });

  const overdueBooks = await prisma.borrowedBook.findMany({
    where: {
      returnedAt: null,
      dueDate: {
        lt: now,
      },
    },
    include: {
      User: {
        select: { email: true, name: true },
      },
      Book: {
        select: { title: true },
      },
    },
  });

  for (const record of dueTomorrowBooks) {
    const { User, Book } = record;
    const emailBody = `Hello ${User.name},\n\nThis is a friendly reminder that the book "${Book.title}" is due tomorrow. Please return it on time to avoid any fines.\n\nThank you.`;
    await sendEmail(User.email, "Book Return Reminder", emailBody);
  }


  for (const record of overdueBooks) {
    const { User, Book } = record;
    const emailBody = `Hello ${User.name},\n\nThe book "${Book.title}" is overdue. You are now incurring a fine of $1 per day until it is returned. Please return it as soon as possible to minimize your fine.\n\nThank you.`;
    await sendEmail(User.email, "Overdue Book Notification", emailBody);
  }
};

cron.schedule("0 8 * * *", sendReturnReminders, {
  timezone: "UTC", 
});