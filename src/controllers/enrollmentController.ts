import express, { Request, Response } from "express";
import pool from "../config/db.config";
import { asyncHandler } from "../middlewares/asyncHandler";
import { UserRequest } from "../utils/types/user";
export const enrollUser = asyncHandler(
  async (req: UserRequest, res: Response) => {
    const userId = req.user?.id;
    const { studentId, courseId } = req.body;

    //Check if token is provided
    if (!req.user) {
      res.status(401).json({ message: "You are not authorized to do this" });
      return;
    }

    //Check if studentId and courseId are provided
    if (!studentId || !courseId) {
      res.status(400).json({ message: "Please provide the necessary details" });
      return;
    }

    // 1. Get the user's role ID and role name
    const userRoleQuery = `
        SELECT u."roleId", r.name AS role_name
        FROM public."user" u
        JOIN public.role r ON u."roleId" = r.id  
        WHERE u.id = $1
      `;
    const userRoleValues = [userId];

    try {
      const userRoleResult = await pool.query(userRoleQuery, userRoleValues);
      if (userRoleResult.rows.length === 0) {
        res.status(404).json({ message: "User not found." }); // User not found
        return;
      }
      const userRole = userRoleResult.rows[0].role_name; // Get the role name

      if (userRole !== "Admin") {
        res.status(403).json({ message: "Only admin can enroll." });
        return;
      }
    } catch (error) {
      console.error("Error checking user role:", error);
      res.status(500).json({ message: "Error checking user role", error });
      return;
    }
    //Check If student already  enrolled
    const queryResult = await pool.query(
      "SELECT FROM public.enrollment WHERE studentId=$1 RETURNING *",
      [studentId]
    );

    if (queryResult.rows.length > 0) {
      res.status(400).json({ message: "Student already enrolled" });
      return;
    }

    //Insert into enrollment table
    const enrollment = await pool.query(
      `INSERT INTO public.enrollment ("studentId", "courseId") VALUES ($1, $2) RETURNING *`,
      [studentId, courseId, userId]
    );

    res.status(201).json({
      message: "Student enrolled successfully",
      enrollment: enrollment.rows[0],
    });
    return;
  }
);



