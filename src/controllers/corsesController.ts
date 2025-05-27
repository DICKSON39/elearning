import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler";
import { UserRequest } from "../utils/types/user";
import pool from "../config/db.config";
import path from "path";
import fs from "fs";
 
import { v4 as uuid } from "uuid"; // for unique filenames
import { supabase } from "../utils/supabaseClient";

export const createCourse = async (req: Request, res: Response) => {
  try {
    const { title, description, teacher_id,price } = req.body;

    let imageUrl = null;

    if (req.file) {
      const fileExt = req.file.originalname.split(".").pop();
      const fileName = `${uuid()}.${fileExt}`;
      const filePath = `courses/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("myfiles")
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("myfiles")
        .getPublicUrl(filePath);

      imageUrl = data.publicUrl;
    }

    const result = await pool.query(
  `INSERT INTO public.course (title, description, "teacherId", price, "imageUrl") VALUES ($1, $2, $3, $4, $5) RETURNING *`,
  [title, description, teacher_id, price, imageUrl]
);


    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export const getCoursesById = asyncHandler(
  async (req: Request, res: Response) => {
    const { courseId } = req.params; // assuming the course ID is passed as a URL parameter

    try {
      const courseQuery = await pool.query(
        `SELECT id, title, description, price, "teacherId", "imageUrl"
       FROM public.course
       WHERE id = $1`,
        [courseId],
      );

      if (courseQuery.rows.length === 0) {
        return res.status(404).json({ message: "Course not found" });
      }

      res.status(200).json(courseQuery.rows[0]);
    } catch (error) {
      console.error("Error fetching course:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

export const getAllCourse = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await pool.query(
      `SELECT id  title, description, price, "teacherId", "imageUrl"  FROM public.course ORDER BY id ASC`,
    );

    res.status(200).json(
      result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        teacherId: row.teacherId,
        image: row.imageUrl,
      })),
    );
  },
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
    ORDER BY course.id ASC`,
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
      })),
    );
  },
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
      [teacherId],
    );

    res.status(200).json(result.rows);
  },
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
      [teacherId],
    );

    res.status(200).json(result.rows);
  },
);

export const deleteCourse = asyncHandler(
  async (req: UserRequest, res: Response) => {
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
    const courseResult = await pool.query(
      `SELECT * FROM public.course WHERE id = $1`,
      [courseId],
    );
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
      res
        .status(403)
        .json({ message: "Access Denied: You cannot delete this course" });
      return;
    }

    // Delete the course record
    await pool.query(`DELETE FROM public.course WHERE id = $1`, [courseId]);

    // Optionally delete the image file from disk
   if (course.imageurl) {
  const filePath = course.imageurl.split("/").slice(-2).join("/"); // extract `folder/filename`

  const { error: deleteError } = await supabase.storage
    .from("myfiles")
    .remove([filePath]);

  if (deleteError) console.error("Error deleting image from Supabase:", deleteError);
}

    res.status(200).json({ message: "✅ Course deleted successfully" });
  },
);

//Updating A course
export const updateCourse = asyncHandler(async (req: UserRequest, res: Response) => {
  const courseId = parseInt(req.params.id);

  if (isNaN(courseId)) {
     res.status(400).json({ message: "Invalid course ID" });
     return
  }

  if (!req.user) {
     res.status(401).json({ message: "Not Authorized" });
     return
  }

  const { title, description, price } = req.body;

  if (!title || !description || !price) {
     res.status(400).json({ message: "All fields are required" });
     return
  }

  const courseResult = await pool.query(
    "SELECT * FROM public.course WHERE id = $1",
    [courseId]
  );

  if (courseResult.rowCount === 0) {
     res.status(404).json({ message: "Course not found" });
     return
  }

  const course = courseResult.rows[0];

  // Authorization check
  if (
    req.user.role_name !== "Admin" &&
    !(req.user.role_name === "Teacher" && req.user.id === course.teacherid)
  ) {
     res.status(403).json({ message: "Access Denied: You cannot update this course" });
     return
  }

  let imageUrl = course.imageurl;

  if (req.file) {
    // 1. Delete old image if exists
    if (imageUrl) {
      const oldPath = imageUrl.split("/").slice(-2).join("/"); // "folder/filename"
      await supabase.storage.from("myfiles").remove([oldPath]);
    }

    // 2. Upload new image
    const fileExt = req.file.originalname.split(".").pop();
    const fileName = `${uuid()}.${fileExt}`;
    const filePath = `courses/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("myfiles")
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError.message);
       res.status(500).json({ message: "Image upload failed" });
       return
    }

    const { data } = supabase.storage
      .from("myfiles")
      .getPublicUrl(filePath);

    imageUrl = data.publicUrl;
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
