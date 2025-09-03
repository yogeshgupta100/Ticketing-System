import express from "express";
import { body, validationResult, param } from "express-validator";
import multer from "multer";
import path from "path";
import { protect, canAccessTicket } from "../middleware/auth.js";
import Message from "../models/Message.js";
import { stompWebSocketService } from "../services/stompWebSocketService.js";
import Ticket from "../models/Ticket.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".pdf",
      ".doc",
      ".docx",
      ".txt",
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("File type not allowed"));
    }
  },
});

const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size is 10MB.",
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files. Maximum is 5 files.",
      });
    }
  }
  if (error.message === "File type not allowed") {
    return res.status(400).json({
      success: false,
      message:
        "File type not allowed. Supported types: jpg, jpeg, png, gif, pdf, doc, docx, txt",
    });
  }
  next(error);
};

router.get("/:ticketId", protect, canAccessTicket, async (req, res) => {
  try {
    const { ticketId } = req.params;

    const messages = await Message.findByTicket(ticketId, {});

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching messages",
    });
  }
});

router.post(
  "/:ticketId",
  protect,
  canAccessTicket,
  upload.array("attachments", 5),
  handleMulterError,
  [
    body("content")
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage("Message content cannot exceed 2000 characters"),
    body("replyTo")
      .optional()
      .isMongoId()
      .withMessage("Invalid reply message ID"),
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

      const { ticketId } = req.params;
      const { content = "", replyTo } = req.body;

      if (!content.trim() && (!req.files || req.files.length === 0)) {
        return res.status(400).json({
          success: false,
          message: "Message must contain either content or attachments",
        });
      }

      const attachments = req.files
        ? req.files.map((file) => ({
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            path: `/uploads/${file.filename}`,
            uploadedAt: new Date(),
          }))
        : [];

      const message = await Message.create({
        ticket: ticketId,
        sender: req.user._id,
        content,
        replyTo,
        attachments,
      });

      await message.populate("sender", "name email role");
      if (replyTo) {
        await message.populate("replyTo", "content sender");
      }

      await Ticket.findByIdAndUpdate(ticketId, {
        lastActivity: new Date(),
      });

      stompWebSocketService.broadcastNewMessage(ticketId, message);

      res.status(201).json({
        success: true,
        message: "Message sent successfully",
        data: message,
      });
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while sending message",
      });
    }
  }
);

router.put(
  "/:id",
  protect,
  [
    body("content")
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage("Message content must be between 1 and 2000 characters"),
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

      const { id } = req.params;
      const { content } = req.body;

      const message = await Message.findById(id);
      if (!message) {
        return res.status(404).json({
          success: false,
          message: "Message not found",
        });
      }

      if (message.sender.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only edit your own messages",
        });
      }

      const updatedMessage = await message.editMessage(content, req.user._id);
      await updatedMessage.populate("sender", "name email role");

      stompWebSocketService.broadcastNewMessage(message.ticket, updatedMessage);

      res.json({
        success: true,
        message: "Message updated successfully",
        data: updatedMessage,
      });
    } catch (error) {
      console.error("Edit message error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while editing message",
      });
    }
  }
);

router.delete("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    const canDelete =
      message.sender.toString() === req.user._id.toString() ||
      req.user.role === "ADMIN";

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this message",
      });
    }

    await Message.findByIdAndDelete(id);

    stompWebSocketService.broadcastNewMessage(message.ticket, {
      id,
      deleted: true,
    });

    res.json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting message",
    });
  }
});

router.post("/:id/read", protect, async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    await message.markAsRead(req.user._id);

    res.json({
      success: true,
      message: "Message marked as read",
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while marking message as read",
    });
  }
});

router.post(
  "/:id/reaction",
  protect,
  [
    body("emoji")
      .trim()
      .isLength({ min: 1, max: 10 })
      .withMessage("Emoji must be between 1 and 10 characters"),
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

      const { id } = req.params;
      const { emoji } = req.body;

      const message = await Message.findById(id);
      if (!message) {
        return res.status(404).json({
          success: false,
          message: "Message not found",
        });
      }

      await message.addReaction(req.user._id, emoji);

      res.json({
        success: true,
        message: "Reaction updated successfully",
      });
    } catch (error) {
      console.error("Add reaction error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while adding reaction",
      });
    }
  }
);

export default router;
