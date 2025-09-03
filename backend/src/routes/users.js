import express from "express";
import { protect, requireAdmin } from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

router.get("/", protect, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password");

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching users",
    });
  }
});

router.get("/agents", protect, async (req, res) => {
  try {
    const agents = await User.find({
      role: { $in: ["AGENT", "ADMIN"] },
      isActive: true,
    }).select("name email role");

    res.json({
      success: true,
      data: agents,
    });
  } catch (error) {
    console.error("Get agents error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching agents",
    });
  }
});

router.patch("/:id/role", protect, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;

    if (!["CUSTOMER", "AGENT", "ADMIN"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be CUSTOMER, AGENT, or ADMIN",
      });
    }

    if (req.params.id === req.user._id.toString() && role !== "ADMIN") {
      return res.status(400).json({
        success: false,
        message: "Cannot remove your own admin role",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User role updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Update user role error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating user role",
    });
  }
});

export default router;
