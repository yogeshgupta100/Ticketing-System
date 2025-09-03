import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/models/User.js";
import Ticket from "./src/models/Ticket.js";
import Message from "./src/models/Message.js";

dotenv.config();

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    await User.deleteMany({});
    await Ticket.deleteMany({});
    await Message.deleteMany({});
    console.log("Cleared existing data");

    const admin = await User.create({
      name: "Admin User",
      email: "admin@example.com",
      password: "password123",
      role: "ADMIN",
    });

    const agent = await User.create({
      name: "Support Agent",
      email: "agent@example.com",
      password: "password123",
      role: "AGENT",
    });

    const customer = await User.create({
      name: "John Customer",
      email: "customer@example.com",
      password: "password123",
      role: "CUSTOMER",
    });

    console.log("Created test users");

    const ticket1 = await Ticket.create({
      title: "Website not loading",
      description: "I cannot access the website. It shows a blank page.",
      priority: "HIGH",
      category: "Technical Issue",
      tags: ["website", "loading"],
      customer: customer._id,
      assignee: agent._id,
    });

    const ticket2 = await Ticket.create({
      title: "Payment failed",
      description: "My payment was declined. Please help.",
      priority: "URGENT",
      category: "Billing",
      tags: ["payment", "billing"],
      customer: customer._id,
    });

    console.log("Created test tickets");

    await Message.create({
      ticket: ticket1._id,
      sender: customer._id,
      content: "Hello, I need help with the website.",
      isInternal: false,
    });

    await Message.create({
      ticket: ticket1._id,
      sender: agent._id,
      content: "Hi John, I can see the issue. Let me investigate.",
      isInternal: false,
    });

    await Message.create({
      ticket: ticket1._id,
      sender: agent._id,
      content: "This looks like a server issue. I'll escalate it.",
      isInternal: true,
    });

    console.log("Created test messages");

    console.log("\nDatabase seeded successfully!");
    console.log("\nTest Accounts:");
    console.log("Admin: admin@example.com / password123");
    console.log("Agent: agent@example.com / password123");
    console.log("Customer: customer@example.com / password123");
  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

seedDatabase();
