import express from "express";
import { body, validationResult, query } from "express-validator";
import { protect, requireAgent, canAccessTicket } from "../middleware/auth.js";
import Ticket from "../models/Ticket.js";
import { stompWebSocketService } from "../services/stompWebSocketService.js";
import User from "../models/User.js";

const router = express.Router();

router.get(
  "/",
  protect,
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("status")
      .optional()
      .isIn(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"])
      .withMessage("Invalid status"),
    query("priority")
      .optional()
      .isIn(["LOW", "MEDIUM", "HIGH", "URGENT"])
      .withMessage("Invalid priority"),
    query("search")
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage("Search query cannot be empty"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const {
        page = 1,
        limit = 10,
        status,
        priority,
        assigneeId,
        customerId,
        tags,
        search,
      } = req.query;

      const query = {};

      if (req.user.role === "CUSTOMER") {
        query.$or = [{ assignedBy: req.user._id }, { assignee: req.user._id }];
      } else if (req.user.role === "AGENT") {
        query.assignee = req.user._id;
      }

      if (status) query.status = status;
      if (priority) query.priority = priority;
      if (assigneeId) {
        if (assigneeId === "null") {
          query.assignee = null;
        } else {
          query.assignee = assigneeId;
        }
      }
      if (customerId) query.customer = customerId;
      if (tags) {
        if (Array.isArray(tags)) {
          query.tags = { $in: tags };
        } else {
          query.tags = tags;
        }
      }
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const total = await Ticket.countDocuments(query);
      const totalPages = Math.ceil(total / parseInt(limit));

      const tickets = await Ticket.find(query)
        .populate("customer", "name email")
        .populate("assignee", "name email")
        .populate("assignedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      res.json({
        success: true,
        data: tickets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
        },
      });
    } catch (error) {
      console.error("Get tickets error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching tickets",
      });
    }
  }
);

router.get("/:id", protect, canAccessTicket, async (req, res) => {
  try {
    const ticket = req.ticket;

    const Message = (await import("../models/Message.js")).default;

    const messages = await Message.find({ ticket: ticket._id })
      .populate("sender", "name email role")
      .sort({ createdAt: 1 });

    const ticketWithMessages = {
      ...ticket.toObject(),
      messages: messages,
    };

    res.json({
      success: true,
      data: ticketWithMessages,
    });
  } catch (error) {
    console.error("Get ticket error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching ticket",
    });
  }
});

router.post(
  "/",
  protect,
  [
    body("title")
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage("Title must be between 5 and 200 characters"),
    body("description")
      .trim()
      .isLength({ min: 10, max: 2000 })
      .withMessage("Description must be between 10 and 2000 characters"),
    body("priority")
      .optional()
      .isIn(["LOW", "MEDIUM", "HIGH", "URGENT"])
      .withMessage("Invalid priority level"),
    body("category")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("Category cannot exceed 50 characters"),
    body("tags").optional().isArray().withMessage("Tags must be an array"),
    body("tags.*")
      .optional()
      .trim()
      .isLength({ min: 1, max: 30 })
      .withMessage("Each tag must be between 1 and 30 characters"),
    body("assigneeId")
      .optional()
      .isMongoId()
      .withMessage("Invalid assignee ID"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { title, description, priority, category, tags, assigneeId } =
        req.body;

      let customerId = req.user._id;
      let assignee = null;

      if (req.user.role === "ADMIN") {
        if (req.body.customerId) {
          customerId = req.body.customerId;
        }
        if (assigneeId) {
          assignee = assigneeId;
        }
      } else if (req.user.role === "AGENT") {
        if (req.body.customerId) {
          customerId = req.body.customerId;
        }
        if (assigneeId && assigneeId !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: "Agents can only assign tickets to themselves",
          });
        }
        assignee = req.user._id;
      } else if (req.user.role === "CUSTOMER") {
        if (
          req.body.customerId &&
          req.body.customerId !== req.user._id.toString()
        ) {
          return res.status(403).json({
            success: false,
            message: "Customers can only create tickets for themselves",
          });
        }

        if (req.body.assigneeId) {
          const assigneeUser = await User.findById(req.body.assigneeId);
          if (!assigneeUser || assigneeUser.role !== "CUSTOMER") {
            return res.status(403).json({
              success: false,
              message: "Customers can only assign tickets to other customers",
            });
          }
          assignee = req.body.assigneeId;
        } else {
          assignee = req.user._id;
        }
      }

      const ticket = await Ticket.create({
        title,
        description,
        priority: priority || "MEDIUM",
        category,
        tags: tags || [],
        customer: customerId,
        assignee,
        assignedBy: req.user._id,
      });

      await ticket.populate("customer", "name email");
      await ticket.populate("assignee", "name email");
      await ticket.populate("assignedBy", "name email");

      stompWebSocketService.broadcastTicketUpdate(
        ticket._id,
        "TICKET_CREATED",
        ticket
      );

      res.status(201).json({
        success: true,
        message: "Ticket created successfully",
        data: ticket,
      });
    } catch (error) {
      console.error("Create ticket error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while creating ticket",
      });
    }
  }
);

router.put(
  "/:id",
  protect,
  canAccessTicket,
  [
    body("title")
      .optional()
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage("Title must be between 5 and 200 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ min: 10, max: 2000 })
      .withMessage("Description must be between 10 and 2000 characters"),
    body("status")
      .optional()
      .isIn(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"])
      .withMessage("Invalid status"),
    body("priority")
      .optional()
      .isIn(["LOW", "MEDIUM", "HIGH", "URGENT"])
      .withMessage("Invalid priority level"),
    body("assigneeId")
      .optional()
      .isMongoId()
      .withMessage("Invalid assignee ID"),
    body("category")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("Category cannot exceed 50 characters"),
    body("tags").optional().isArray().withMessage("Tags must be an array"),
    body("tags.*")
      .optional()
      .trim()
      .isLength({ min: 1, max: 30 })
      .withMessage("Each tag must be between 1 and 30 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const ticket = req.ticket;
      const updateFields = {};

      if (req.user.role === "ADMIN") {
        Object.keys(req.body).forEach((key) => {
          if (req.body[key] !== undefined) {
            updateFields[key] = req.body[key];
          }
        });
      } else if (req.user.role === "AGENT") {
        Object.keys(req.body).forEach((key) => {
          if (req.body[key] !== undefined) {
            if (key === "assigneeId") {
              if (req.body[key] !== req.user._id.toString()) {
                return res.status(403).json({
                  success: false,
                  message: "Agents can only assign tickets to themselves",
                });
              }
            }
            updateFields[key] = req.body[key];
          }
        });
      } else {
        const assigneeId = ticket.assignee?._id || ticket.assignee;
        if (assigneeId && assigneeId.toString() === req.user._id.toString()) {
          Object.keys(req.body).forEach((key) => {
            if (req.body[key] !== undefined) {
              updateFields[key] = req.body[key];
            }
          });
        } else {
          const allowedFields = ["title", "description", "category", "tags"];
          const requestedFields = Object.keys(req.body);
          const unauthorizedFields = requestedFields.filter(
            (field) => !allowedFields.includes(field)
          );

          if (unauthorizedFields.length > 0) {
            return res.status(403).json({
              success: false,
              message: `Customers can only update: ${allowedFields.join(
                ", "
              )}. Cannot update: ${unauthorizedFields.join(", ")}`,
            });
          }

          allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
              updateFields[field] = req.body[field];
            }
          });
        }
      }

      if (updateFields.assigneeId && updateFields.assigneeId !== "null") {
        const assigneeUser = await User.findById(updateFields.assigneeId);
        if (!assigneeUser) {
          return res.status(400).json({
            success: false,
            message: "Invalid assignee user",
          });
        }

        if (req.user.role === "CUSTOMER") {
          if (assigneeUser.role !== "CUSTOMER") {
            return res.status(400).json({
              success: false,
              message: "Customers can only assign tickets to other customers",
            });
          }
        } else if (req.user.role === "AGENT") {
          if (assigneeUser.role !== "AGENT") {
            return res.status(400).json({
              success: false,
              message: "Agents can only assign tickets to other agents",
            });
          }
        }
      }

      const updatedTicket = await Ticket.findByIdAndUpdate(
        ticket._id,
        updateFields,
        { new: true, runValidators: true }
      )
        .populate("customer", "name email")
        .populate("assignee", "name email")
        .populate("assignedBy", "name email");
      try {
        stompWebSocketService.broadcastTicketUpdate(
          ticket._id,
          "TICKET_UPDATED",
          updatedTicket
        );
      } catch (wsError) {
        console.error("WebSocket broadcast error:", wsError);
      }

      res.json({
        success: true,
        message: "Ticket updated successfully",
        data: updatedTicket,
      });
    } catch (error) {
      console.error("Update ticket error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while updating ticket",
      });
    }
  }
);

router.delete(
  "/:id",
  protect,
  requireAgent,
  canAccessTicket,
  async (req, res) => {
    try {
      const ticket = req.ticket;

      if (ticket.status !== "CLOSED") {
        return res.status(400).json({
          success: false,
          message: "Only closed tickets can be deleted",
        });
      }

      await Ticket.findByIdAndDelete(ticket._id);

      stompWebSocketService.broadcastTicketUpdate(
        ticket._id,
        "TICKET_DELETED",
        { id: ticket._id }
      );

      res.json({
        success: true,
        message: "Ticket deleted successfully",
      });
    } catch (error) {
      console.error("Delete ticket error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while deleting ticket",
      });
    }
  }
);

export default router;
