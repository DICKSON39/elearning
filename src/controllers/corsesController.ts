import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler";
import { UserRequest } from "../utils/types/user";
import pool from "../config/db.config";
import path from "path";
import fs from "fs";

export const CreateCourse = asyncHandler(
  async (req: UserRequest, res: Response) => {
    // console.log("Reached create course");
    // console.log("BODY:", req.body);
    // console.log("FILE:", req.file);

    if (!req.user) {
      res.status(401).json({ message: "Not Authorized" });
      return;
    }

    //console.log("User:", req.user);

    const { title, description, price, teacherId } = req.body;

    // Validate if all fields are provided, including the file
    if (!title || !description || !price || !teacherId || !req.file) {
      res
        .status(400)
        .json({ message: "All fields including image are required" });
      return;
    }

    // Ensure teacherId is valid (positive integer)
    if (isNaN(teacherId) || teacherId <= 0) {
      res.status(400).json({ message: "Invalid teacher ID" });
      return;
    }

    // Check user role for authorization
    if (req.user.role_name !== "Teacher" && req.user.role_name !== "Admin") {
      res.status(403).json({ message: "Access Denied" });
      return;
    }

    // Store the file path (ensure the correct image URL path)
    const imageUrl = `/uploads/courses/${req.file.filename}`;

    const result = await pool.query(
      `INSERT INTO public.course (title, description, price, "teacherId", "imageUrl") 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, description, price, teacherId, imageUrl]
    );

    res.status(201).json({
      message: "✅ Course added successfully",
      course: result.rows[0],
    });
    return;
  }
);

export const getCoursesById = asyncHandler(
  async (req: Request, res: Response) => {
    const { courseId } = req.params; // assuming the course ID is passed as a URL parameter

    try {
      const courseQuery = await pool.query(
        `SELECT id, title, description, price, "teacherId", "imageUrl"
       FROM public.course
       WHERE id = $1`,
        [courseId]
      );

      if (courseQuery.rows.length === 0) {
        return res.status(404).json({ message: "Course not found" });
      }

      res.status(200).json(courseQuery.rows[0]);
    } catch (error) {
      console.error("Error fetching course:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

export const getAllCourse = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await pool.query(
      `SELECT id  title, description, price, "teacherId", "imageUrl"  FROM public.course ORDER BY id ASC`
    );

    res.status(200).json(
      result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        teacherId: row.teacherId,
        image: row.imageUrl,
      }))
    );
  }
);

export const getAllCourseTeacher = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await pool.query(
      `SELECT
      course.id,
      course.title,
      course.description,
      course.price,
      course."imageUrl",
      teacher.name AS teacher_name,
      teacher_role.name AS role_name
    FROM public.course
    JOIN public.user AS teacher ON course."teacherId" = teacher.id
    JOIN public.role AS teacher_role ON teacher."roleId" = teacher_role.id
    WHERE teacher_role.name = 'Teacher'
    ORDER BY course.id ASC`
    );

    // console.log("Database Result:", result);
    // console.log("Result Rows:", result.rows);

    res.status(200).json(
      result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        teacherName: row.teacher_name,
        roleName: row.role_name,
        image: row.imageUrl,
      }))
    );
  }
);

// Example of a controller function to get courses taught by the currently logged-in teacher (assuming you have some form of authentication middleware)
export const getMyCoursesAsTeacher = asyncHandler(
  async (req: UserRequest, res: Response) => {
    const teacherId = req.user?.id;

    if (!teacherId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const result = await pool.query(
      `SELECT
      course.id,
      course.title,
      course.description,
      course.price,
      course."imageUrl"
    FROM public.course
    WHERE course."teacherId" = $1
    ORDER BY course.id ASC`,
      [teacherId]
    );

    res.status(200).json(result.rows);
  }
);

// Get courses by teacher (for logged-in teacher)
export const getTeacherCourses = asyncHandler(
  async (req: UserRequest, res: Response) => {
    const teacherId = req.user?.id;

    if (!teacherId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const result = await pool.query(
      `SELECT 
      course.id, 
      course.title, 
      course.description, 
      course.price, 
      course."imageUrl" 
    FROM public.course 
    WHERE course."teacherId" = $1
    ORDER BY course.id ASC`,
      [teacherId]
    );

    res.status(200).json(result.rows);
  }
);


export const deleteCourse = asyncHandler(async (req: UserRequest, res: Response) => {
  const courseId = parseInt(req.params.id);

  if (!req.user) {
    res.status(401).json({ message: "Not Authorized" });
    return;
  }

  if (isNaN(courseId)) {
    res.status(400).json({ message: "Invalid course ID" });
    return;
  }

  // Fetch course to verify ownership or existence
  const courseResult = await pool.query(`SELECT * FROM public.course WHERE id = $1`, [courseId]);
  if (courseResult.rowCount === 0) {
    res.status(404).json({ message: "Course not found" });
    return;
  }

  const course = courseResult.rows[0];

  // Only Admin or the teacher who created the course can delete
  if (
    req.user.role_name !== "Admin" &&
    !(req.user.role_name === "Teacher" && req.user.id === course.teacherId)
  ) {
    res.status(403).json({ message: "Access Denied: You cannot delete this course" });
    return;
  }

  // Delete the course record
  await pool.query(`DELETE FROM public.course WHERE id = $1`, [courseId]);

  // Optionally delete the image file from disk
  if (course.imageUrl) {
    const imagePath = path.join(__dirname, "../../..", course.imageUrl);
    fs.unlink(imagePath, (err) => {
      if (err) console.warn("Failed to delete image:", err.message);
    });
  }

  res.status(200).json({ message: "✅ Course deleted successfully" });
});

//Updating A course
export const updateCourse = asyncHandler(async (req: UserRequest, res: Response) => {
  const courseId = parseInt(req.params.id);
  //console.log('BODY:', req.body);
  //console.log('FILE:', req.file);

  if (isNaN(courseId)) {
    res.status(400).json({ message: "Invalid course ID" });
    return;
  }

  if (!req.user) {
    res.status(401).json({ message: "Not Authorized" });
    return;
  }

  const { title, description, price } = req.body;

  if (!title || !description || !price) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  // Fetch existing course
  const courseResult = await pool.query("SELECT * FROM public.course WHERE id = $1", [courseId]);
  if (courseResult.rowCount === 0) {
    res.status(404).json({ message: "Course not found" });
    return;
  }

  const course = courseResult.rows[0];

  // Authorization
  if (
    req.user.role_name !== "Admin" &&
    !(req.user.role_name === "Teacher" && req.user.id === course.teacherId)
  ) {
    res.status(403).json({ message: "Access Denied: You cannot update this course" });
    return;
  }

  // If a new image file was uploaded
  let imageUrl = course.imageUrl; // Keep the old one by default
  if (req.file) {
    imageUrl = `/uploads/courses/${req.file.filename}`;
  }

  const updatedCourseResult = await pool.query(
    `UPDATE public.course 
     SET title = $1, description = $2, price = $3, "imageUrl" = $4 
     WHERE id = $5 
     RETURNING *`,
    [title, description, price, imageUrl, courseId]
  );

  res.status(200).json({
    message: "✅ Course updated successfully",
    course: updatedCourseResult.rows[0],
  });
});



