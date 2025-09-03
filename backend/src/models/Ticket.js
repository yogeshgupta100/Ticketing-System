import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    status: {
      type: String,
      enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
      default: "OPEN",
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Customer is required"],
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Assigned by is required"],
    },
    category: {
      type: String,
      trim: true,
      maxlength: [50, "Category cannot exceed 50 characters"],
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [30, "Tag cannot exceed 30 characters"],
      },
    ],
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
    estimatedResolutionTime: {
      type: Date,
      default: null,
    },
    actualResolutionTime: {
      type: Date,
      default: null,
    },
    satisfactionRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    internalNotes: [
      {
        content: String,
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        isInternal: {
          type: Boolean,
          default: true,
        },
      },
    ],
    escalationLevel: {
      type: Number,
      min: 0,
      max: 3,
      default: 0,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ticketSchema.virtual("ageInDays").get(function () {
  const now = new Date();
  const created = this.createdAt;
  const diffTime = Math.abs(now - created);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

ticketSchema.virtual("timeSinceLastActivity").get(function () {
  const now = new Date();
  const lastActivity = this.lastActivity || this.createdAt;
  const diffTime = Math.abs(now - lastActivity);
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );

  if (days > 0) {
    return `${days} day${days > 1 ? "s" : ""}`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""}`;
  } else {
    return "Less than an hour";
  }
});

ticketSchema.index({ customer: 1, createdAt: -1 });
ticketSchema.index({ assignee: 1, status: 1 });
ticketSchema.index({ status: 1, priority: 1 });
ticketSchema.index({ tags: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ lastActivity: -1 });

ticketSchema.pre("save", function (next) {
  this.lastActivity = new Date();
  next();
});

ticketSchema.statics.findByStatus = function (status) {
  return this.find({ status })
    .populate("customer", "name email")
    .populate("assignee", "name email");
};

ticketSchema.statics.findByPriority = function (priority) {
  return this.find({ priority })
    .populate("customer", "name email")
    .populate("assignee", "name email");
};

ticketSchema.statics.findByAssignee = function (assigneeId) {
  return this.find({ assignee: assigneeId })
    .populate("customer", "name email")
    .populate("assignee", "name email");
};

ticketSchema.statics.findByCustomer = function (customerId) {
  return this.find({ customer: customerId })
    .populate("customer", "name email")
    .populate("assignee", "name email");
};

ticketSchema.methods.addInternalNote = function (content, authorId) {
  this.internalNotes.push({
    content,
    author: authorId,
    isInternal: true,
  });
  this.lastActivity = new Date();
  return this.save();
};

ticketSchema.methods.updateStatus = function (newStatus) {
  this.status = newStatus;
  this.lastActivity = new Date();

  if (newStatus === "RESOLVED") {
    this.actualResolutionTime = new Date();
  }

  return this.save();
};

const Ticket = mongoose.model("Ticket", ticketSchema);

export default Ticket;
