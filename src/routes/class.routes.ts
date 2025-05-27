import express, { Router } from "express";
import { protect } from "../middlewares/auth/protect";
import { Teacher } from "../middlewares/auth/roleMiddleware";


import {
  createClass,
  deleteClass,
  getClassById,

  getTeacherClasses,
  updateClass,
} from "../controllers/classController";
import {upload} from "../middlewares/upload";

const router = Router();

router.post("/create-class",protect,Teacher, upload.array("files", 5), createClass);

router.get("/class/teacher", protect, Teacher, getTeacherClasses);

router.get("/class/:id", protect, getClassById);
router.put("/class/:id", protect, Teacher, updateClass);
router.delete("/class/:id", protect, Teacher, deleteClass);


export default router;
