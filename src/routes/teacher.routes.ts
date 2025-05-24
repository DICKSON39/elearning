import { Router } from "express";
import { protect } from "../middlewares/auth/protect";
import { Admin } from "../middlewares/auth/roleMiddleware";
import { getAllTeachers, getTeacherById } from "../controllers/userController";
import { getTeacherCourses } from "../controllers/corsesController";

const router = Router();

router.get("/", protect, Admin, getAllTeachers);
router.get("/teachers/:teacherId", protect, getTeacherById);
router.get("/teacher/my-courses", protect, getTeacherCourses);

export default router;
