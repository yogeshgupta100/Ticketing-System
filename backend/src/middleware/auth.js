import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Token is valid but user not found.",
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: "User account is deactivated.",
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error during authentication.",
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route.`,
      });
    }

    next();
  };
};

export const requireAdmin = (req, res, next) => {
  return authorize("ADMIN")(req, res, next);
};

export const requireAgent = (req, res, next) => {
  return authorize("AGENT", "ADMIN")(req, res, next);
};

export const requireOwnership = (resourceModel) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const resource = await resourceModel.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: "Resource not found.",
        });
      }

      if (req.user.role === "ADMIN" || req.user.role === "AGENT") {
        req.resource = resource;
        return next();
      }

      if (
        resource.customer &&
        resource.customer.toString() === req.user._id.toString()
      ) {
        req.resource = resource;
        return next();
      }

      if (
        resource.assignee &&
        resource.assignee.toString() === req.user._id.toString()
      ) {
        req.resource = resource;
        return next();
      }

      return res.status(403).json({
        success: false,
        message:
          "Access denied. You do not have permission to access this resource.",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server error during ownership verification.",
      });
    }
  };
};

export const canAccessTicket = async (req, res, next) => {
  try {
    const ticketId = req.params.ticketId || req.params.id;
    const Ticket = (await import("../models/Ticket.js")).default;

    const ticket = await Ticket.findById(ticketId)
      .populate("customer", "name email")
      .populate("assignee", "name email");

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found.",
      });
    }

    if (req.user.role === "ADMIN" || req.user.role === "AGENT") {
      req.ticket = ticket;
      return next();
    }

    if (ticket.customer._id.toString() === req.user._id.toString()) {
      req.ticket = ticket;
      return next();
    }

    if (
      ticket.assignee &&
      ticket.assignee._id.toString() === req.user._id.toString()
    ) {
      req.ticket = ticket;
      return next();
    }

    return res.status(403).json({
      success: false,
      message:
        "Access denied. You do not have permission to access this ticket.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error during ticket access verification.",
    });
  }
};

export const canSendMessage = async (req, res, next) => {
  try {
    const ticketId = req.params.ticketId || req.body.ticketId;
    const Ticket = (await import("../models/Ticket.js")).default;

    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found.",
      });
    }

    if (req.user.role === "ADMIN" || req.user.role === "AGENT") {
      req.ticket = ticket;
      return next();
    }

    if (ticket.customer.toString() === req.user._id.toString()) {
      req.ticket = ticket;
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "Access denied. You can only send messages to your own tickets.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error during message permission verification.",
    });
  }
};
