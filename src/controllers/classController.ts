import { Response } from "express";

import { v4 as uuidv4 } from "uuid";
import path from "path";
import { supabase } from "../utils/supabaseClient"; // update with your actual path


import { asyncHandler } from "../middlewares/asyncHandler";
import pool from "../config/db.config";
import { UserRequest } from "../utils/types/user";
import { title } from "process";
;


export const createClass = asyncHandler(async (req: UserRequest, res: Response) => {
  const teacherId = req.user?.id;
  const { courseId, Description } = req.body;
  const titles = req.body.titles;

  if (!teacherId) {
     res.status(401).json({ message: "Unauthorized - User not authenticated" });
     return
  }

  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
     res.status(400).json({ message: "Please upload one or more videos." });
     return
  }

  

  try {
    // Check course ownership
    const courseResult = await pool.query(
      `SELECT id, "teacherId" FROM course WHERE id = $1`,
      [courseId]
    );

    if (courseResult.rows.length === 0 || courseResult.rows[0].teacherId !== teacherId) {
       res.status(403).json({ message: "Unauthorized to create class for this course" });
       return
    }

    // Insert new class
    const newClassResult = await pool.query(
      `INSERT INTO class ("Description", "courseId") VALUES ($1, $2) RETURNING id`,
      [Description, courseId]
    );

    const classId = newClassResult.rows[0].id;
    const files = req.files as Express.Multer.File[];

    // Normalize titles array in case it's a single string
    const titlesArray = Array.isArray(titles) ? titles : [titles];

    // Upload videos with their matching titles
    const uploadPromises = files.map(async (file, index) => {
      const title = titlesArray[index] || file.originalname;
      const uniqueFilename = `classes/${classId}/${uuidv4()}${path.extname(file.originalname)}`;

      const { error } = await supabase.storage
        .from("myfiles")
        .upload(uniqueFilename, file.buffer, {
          contentType: file.mimetype,
        });

      if (error) {
        throw new Error(`Supabase upload error: ${error.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from("myfiles")
        .getPublicUrl(uniqueFilename);

      await pool.query(
        `INSERT INTO video ("url", "title", "classSessionId") VALUES ($1, $2, $3)`,
        [publicUrlData.publicUrl, title, classId]
      );
    });

    await Promise.all(uploadPromises);

    res.status(201).json({
      message: "Class created successfully with videos uploaded",
      classId,
    });
  } catch (error) {
    console.error("Error creating class:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unexpected error occurred",
    });
  }
});




export const getTeacherClasses = asyncHandler(async (req: UserRequest, res: Response) => {
  const teacherId = req.user?.id;
  if (!teacherId) return res.status(401).json({ message: "Unauthorized" });

  try {
    // Get all classes with their course title
    const classQuery = `
      SELECT class.*, course.title AS course_name 
  FROM class 
  INNER JOIN course ON class."courseId" = course.id 
  WHERE course."teacherId" = $1
  ORDER BY class."courseId" ASC
    `;

    const { rows: classes } = await pool.query(classQuery, [teacherId]);

    // For each class, fetch its videos
    const classWithVideos = await Promise.all(
      classes.map(async (cls) => {
        const videoQuery = `SELECT id, title, url FROM video WHERE "classSessionId" = $1`;
        const { rows: videos } = await pool.query(videoQuery, [cls.id]);

        return {
          ...cls,
          videos,
        };
      })
    );

    res.status(200).json(classWithVideos);
  } catch (error) {
    console.error("Error getting teacher classes:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});



export const getClassById = asyncHandler(async (req, res) => {
    const classId = parseInt(req.params.id);
    if (isNaN(classId)) return res.status(400).json({ message: "Invalid class ID" });

    const query = `
    SELECT class.*, course.title AS course_name 
    FROM class 
    INNER JOIN course ON class.courseId = course.id 
    WHERE class.id = $1
  `;

    try {
        const { rows } = await pool.query(query, [classId]);
        if (rows.length === 0) return res.status(404).json({ message: "Class not found" });

        res.status(200).json(rows[0]);
    } catch (error) {
        console.error("Error getting class by ID:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export const updateClass = asyncHandler(async (req:UserRequest, res:Response) => {
    const classId = parseInt(req.params.id);
    if (isNaN(classId)) return res.status(400).json({ message: "Invalid class ID" });

    const teacherId = req.user?.id;
    if (!teacherId) return res.status(401).json({ message: "Unauthorized" });

    const { courseId, Description } = req.body;

    try {
        // Check ownership
        const checkOwnerQuery = `
      SELECT course.teacherId FROM class 
      INNER JOIN course ON class.courseId = course.id 
      WHERE class.id = $1
    `;
        const { rows: ownerRows } = await pool.query(checkOwnerQuery, [classId]);
        if (ownerRows.length === 0) return res.status(404).json({ message: "Class not found" });
        if (ownerRows[0].teacherid !== teacherId) return res.status(403).json({ message: "Unauthorized" });

        // Update
        const updateQuery = `
      UPDATE class SET 
        courseId = COALESCE($1, courseId),
        description = COALESCE($2, Description),
        
      WHERE id = $4
      RETURNING *
    `;
        const { rows } = await pool.query(updateQuery, [courseId, Description,  classId]);

        res.status(200).json({ message: "Class updated", class: rows[0] });
    } catch (error) {
        console.error("Error updating class:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});


export const deleteClass = asyncHandler(async (req:UserRequest, res:Response) => {
    const classId = parseInt(req.params.id);
    if (isNaN(classId)) return res.status(400).json({ message: "Invalid class ID" });

    const teacherId = req.user?.id;
    if (!teacherId) return res.status(401).json({ message: "Unauthorized" });

    try {
        // Check ownership
        const checkOwnerQuery = `
      SELECT course.teacherId FROM class 
      INNER JOIN course ON class.courseId = course.id 
      WHERE class.id = $1
    `;
        const { rows: ownerRows } = await pool.query(checkOwnerQuery, [classId]);
        if (ownerRows.length === 0) return res.status(404).json({ message: "Class not found" });
        if (ownerRows[0].teacherid !== teacherId) return res.status(403).json({ message: "Unauthorized" });

        // Delete
        const deleteQuery = `DELETE FROM class WHERE id = $1`;
        await pool.query(deleteQuery, [classId]);

        res.status(200).json({ message: `Class with ID ${classId} deleted` });
    } catch (error) {
        console.error("Error deleting class:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

