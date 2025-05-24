import pool from "../config/db.config";
import { asyncHandler } from "../middlewares/asyncHandler";
import { UserRequest } from "../utils/types/user";
import { Request, Response } from "express";
import { isBigIntObject } from "node:util/types";

export const getDashboard = asyncHandler(
  async (req: UserRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ message: "Not Authorized" });
      return;
    }

    //console.log("📊 Dashboard stats endpoint hit!");
    const userResults = await pool.query("SELECT COUNT(*) FROM public.user");
    const paymentResults = await pool.query(
      "SELECT COUNT(*) FROM public.payment",
    );
    const coursesResults = await pool.query(
      "SELECT COUNT (*) FROM public.course",
    );
    const ClassResults = await pool.query("SELECT COUNT(*) FROM public.class ");
    const totalEnrolled = await pool.query(
      "SELECT COUNT(*) AS total_enrolled FROM public.enrollment",
    );
    const teachersAvailable = await pool.query(
      `SELECT COUNT(*) FROM   public.user AS techer JOIN public.role teacher_role ON techer."roleId" = teacher_role.id WHERE teacher_role.name='Teacher'`,
    );

    const studentsAvailable = await pool.query(
      ` SELECT COUNT(*) FROM   public.user AS student JOIN public.role student_role ON student."roleId" = student_role.id WHERE student_role.name='Student'`,
    );

    res.status(200).json({
      totalUsers: parseInt(userResults.rows[0].count),
      totalPayments: parseInt(paymentResults.rows[0].count),
      totalCourses: parseInt(coursesResults.rows[0].count),
      totalClasses: parseInt(ClassResults.rows[0].count),
      totalEnrolled: parseInt(totalEnrolled.rows[0].total_enrolled),
      totalTeachers: parseInt(teachersAvailable.rows[0].count),
      totalStudents: parseInt(studentsAvailable.rows[0].count),
    });
  },
);

export const showOnlyTeachers = asyncHandler(
  async (req: UserRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ message: "Not Authorized" });
    }

    const result = await pool.query(
      `SELECT * FROM public.user AS teacher JOIN public.role teacher_role ON teacher."roleId" = teacher_role.id WHERE teacher_role.name='Teacher' `,
    );

    res.status(200).json(
      result.rows.map((row) => {
        Email: row.teacher_role.email;
        Phone: row.teacher_role.phoneNumber;
      }),
    );
  },
);

export const showOnlyStudents = asyncHandler(
  async (req: UserRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ message: "Not Authorized" });
    }

    const result = await pool.query(
      `SELECT * FROM public.user AS student JOIN public.role student_role ON student."roleId" = student_role.id WHERE student_role.name='Student'`,
    );

    res.status(200).json(
      result.rows.map((row) => {
        Email: row.student_role.email;
        Phone: row.student_role.phoneNumber;
      }),
    );
  },
);
