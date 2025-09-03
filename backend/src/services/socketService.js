import jwt from "jsonwebtoken";
import User from "../models/User.js";

const connectedUsers = new Map();

export const setupSocketIO = (io) => {
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(" ")[1];

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");

      if (!user || !user.isActive) {
        return next(
          new Error("Authentication error: Invalid or inactive user")
        );
      }

      socket.user = user;
      next();
    } catch (error) {
      return next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.name} (${socket.user.role})`);

    connectedUsers.set(socket.user._id.toString(), {
      socketId: socket.id,
      user: socket.user,
      connectedAt: new Date(),
    });

    socket.join(`user_${socket.user._id}`);

    if (socket.user.role === "AGENT" || socket.user.role === "ADMIN") {
      socket.join("agents");
    }

    socket.on("join_ticket", (ticketId) => {
      socket.join(`ticket_${ticketId}`);
      console.log(`User ${socket.user.name} joined ticket ${ticketId}`);
    });

    socket.on("leave_ticket", (ticketId) => {
      socket.leave(`ticket_${ticketId}`);
      console.log(`User ${socket.user.name} left ticket ${ticketId}`);
    });

    socket.on("typing_start", (data) => {
      socket.to(`ticket_${data.ticketId}`).emit("user_typing", {
        userId: socket.user._id,
        userName: socket.user.name,
        ticketId: data.ticketId,
      });
    });

    socket.on("typing_stop", (data) => {
      socket.to(`ticket_${data.ticketId}`).emit("user_stopped_typing", {
        userId: socket.user._id,
        ticketId: data.ticketId,
      });
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user.name}`);
      connectedUsers.delete(socket.user._id.toString());
    });
  });

  global.io = io;
};

export const emitTicketUpdate = (ticketId, updateType, data) => {
  if (!global.io) return;

  global.io.to(`ticket_${ticketId}`).emit("ticket_update", {
    type: updateType,
    ticketId,
    data,
    timestamp: new Date().toISOString(),
  });

  global.io.to("agents").emit("ticket_update", {
    type: updateType,
    ticketId,
    data,
    timestamp: new Date().toISOString(),
  });
};

export const emitNewMessage = (ticketId, message) => {
  if (!global.io) return;

  global.io.to(`ticket_${ticketId}`).emit("new_message", {
    ticketId,
    message,
    timestamp: new Date().toISOString(),
  });

  global.io.to("agents").emit("new_message", {
    ticketId,
    message,
    timestamp: new Date().toISOString(),
  });
};

export const emitUserNotification = (userId, notification) => {
  if (!global.io) return;

  global.io.to(`user_${userId}`).emit("notification", {
    ...notification,
    timestamp: new Date().toISOString(),
  });
};

export const getConnectedUsers = () => {
  return Array.from(connectedUsers.values());
};

export const isUserOnline = (userId) => {
  return connectedUsers.has(userId.toString());
};

export const getUserSocket = (userId) => {
  const userData = connectedUsers.get(userId.toString());
  return userData ? userData.socketId : null;
};
