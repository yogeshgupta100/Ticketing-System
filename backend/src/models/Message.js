import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      required: [true, "Ticket is required"],
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender is required"],
    },
    content: {
      type: String,
      required: [true, "Message content is required"],
      trim: true,
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },
    messageType: {
      type: String,
      enum: ["TEXT", "FILE", "SYSTEM"],
      default: "TEXT",
    },
    attachments: [
      {
        filename: String,
        originalName: String,
        mimeType: String,
        size: Number,
        path: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    edited: {
      isEdited: {
        type: Boolean,
        default: false,
      },
      editedAt: Date,
      originalContent: String,
    },
    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        emoji: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

messageSchema.virtual("age").get(function () {
  const now = new Date();
  const created = this.createdAt;
  const diffTime = Math.abs(now - created);
  const minutes = Math.floor(diffTime / (1000 * 60));
  const hours = Math.floor(diffTime / (1000 * 60 * 60));
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (days > 0) {
    return `${days} day${days > 1 ? "s" : ""} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  } else {
    return "Just now";
  }
});

messageSchema.index({ ticket: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ createdAt: -1 });

messageSchema.pre("save", function (next) {
  if (this.isModified("content") && !this.isNew) {
    this.edited.isEdited = true;
    this.edited.editedAt = new Date();
    if (!this.edited.originalContent) {
      this.edited.originalContent = this.content;
    }
  }
  next();
});

messageSchema.statics.findByTicket = function (ticketId, options = {}) {
  const query = { ticket: ticketId };

  return this.find(query)
    .populate("sender", "name email role")
    .populate("replyTo", "content sender")
    .sort({ createdAt: 1 });
};

messageSchema.statics.findUnreadByUser = function (userId, ticketId = null) {
  const query = {
    "readBy.user": { $ne: userId },
  };

  if (ticketId) {
    query.ticket = ticketId;
  }

  return this.find(query)
    .populate("ticket", "title")
    .populate("sender", "name email")
    .sort({ createdAt: -1 });
};

messageSchema.methods.markAsRead = function (userId) {
  const existingRead = this.readBy.find(
    (read) => read.user.toString() === userId.toString()
  );

  if (!existingRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date(),
    });
    return this.save();
  }

  return Promise.resolve(this);
};

messageSchema.methods.addReaction = function (userId, emoji) {
  const existingReaction = this.reactions.find(
    (reaction) =>
      reaction.user.toString() === userId.toString() && reaction.emoji === emoji
  );

  if (existingReaction) {
    this.reactions = this.reactions.filter(
      (reaction) =>
        !(
          reaction.user.toString() === userId.toString() &&
          reaction.emoji === emoji
        )
    );
  } else {
    this.reactions.push({
      user: userId,
      emoji,
      createdAt: new Date(),
    });
  }

  return this.save();
};

messageSchema.methods.editMessage = function (newContent, userId) {
  if (this.sender.toString() !== userId.toString()) {
    throw new Error("You can only edit your own messages");
  }

  this.content = newContent;
  return this.save();
};

const Message = mongoose.model("Message", messageSchema);

export default Message;
