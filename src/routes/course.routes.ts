import { Router } from "express";
import { protect } from "../middlewares/auth/protect";
import { Admin, AdminOrTeacher } from "../middlewares/auth/roleMiddleware";
import { upload } from "../middlewares/upload";
import {
  CreateCourse,
  deleteCourse,
  getAllCourse,
  getAllCourseTeacher,
  getCoursesById,
  updateCourse,
} from "../controllers/corsesController";

const router = Router();

router.post("/", protect, Admin, upload.single("image"), CreateCourse);
router.get("/courses/:courseId", protect, getCoursesById);
router.delete("/courses/:id", protect, AdminOrTeacher, deleteCourse);
router.get("/", getAllCourse);
router.get("/courses", getAllCourseTeacher);
router.put(
  "/courses/:id",
  protect,
  AdminOrTeacher,
  upload.single("image"),
  updateCourse,
);

export default router;
