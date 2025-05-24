import { Router } from "express";
import { Admin } from "../middlewares/auth/roleMiddleware";

import { protect } from "../middlewares/auth/protect";
import { getAllStudents, getAllTeachers } from "../controllers/userController";
import {
  getDashboard,
  showOnlyStudents,
  showOnlyTeachers,
} from "../controllers/analyticsController";

const router = Router();

router.get("/", protect, Admin, getDashboard);
router.get("/teachers", protect, Admin, getAllTeachers);
router.get("/students", protect, Admin, getAllStudents);

export default router;
