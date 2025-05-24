import { Router } from "express";

import { protect } from "../middlewares/auth/protect";
import { Admin, AdminOrUser } from "../middlewares/auth/roleMiddleware";
import {
  getUserProfile,
  getUsers,
  deleteUsers,
  updateUser,
  getAllTeachers,
} from "../controllers/userController";

const router = Router();

// Get all users (Admin only)
router.get("/users", protect, Admin, getUsers);

// Get a specific user profile (Admin only)
router.get("/users/:userId", protect, Admin, getUserProfile);

// Delete a user (Admin only)
router.delete("/users/:id", protect, Admin, deleteUsers);

//Update a user
router.put("/users/:id", protect, AdminOrUser, updateUser);

export default router;
