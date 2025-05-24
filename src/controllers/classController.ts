import { asyncHandler } from "../middlewares/asyncHandler";
import { Request, Response } from "express"; // Extended Request type is now globally available
import { UserRequest } from "../utils/types/user";
import { AppDataSource } from "../config/data-source";
import { Course } from "../entities/Course";
import { Class } from "../entities/Class";
import pool from "../config/db.config";
export const createClass = asyncHandler(
  async (req: UserRequest, res: Response) => {
    const teacherId = req.user?.id; // From token
    const { courseId, startTime, endTime, meetingLink, videoPath } = req.body;

    if (!teacherId) {
      res
        .status(401)
        .json({ message: "Unauthorized - User not authenticated" });
      return;
    }

    try {
      // Check if the course exists and belongs to the teacher
      const courseResult = await pool.query(
        `SELECT id, "teacherId" FROM course WHERE id = $1`, // Use quotes for "teacherId"
        [courseId],
      );

      if (
        courseResult.rows.length === 0 ||
        courseResult.rows[0].teacherId !== teacherId
      ) {
        // Access as teacherId
        res
          .status(403)
          .json({ message: "Unauthorized to create class for this course" });
        return;
      }

      // Insert the new class into the database
      const newClassResult = await pool.query(
        `
      INSERT INTO class ("startTime", "endTime", "meetingLink", "courseId", "videoPath")
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, "startTime", "endTime", "meetingLink", "courseId", "isLive", "videoPath"
      `,
        [startTime, endTime, meetingLink, courseId, videoPath],
      );

      if (newClassResult.rows.length > 0) {
        res.status(201).json({
          message: "Class created successfully",
          class: newClassResult.rows[0],
        });
      } else {
        res.status(500).json({ message: "Failed to create class" });
      }
    } catch (error) {
      console.error("Error creating class:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);
export const getTeacherClasses = asyncHandler(
  async (req: UserRequest, res: Response) => {
    const teacherId = req.user?.id; // From token

    if (!teacherId) {
      return res
        .status(401)
        .json({ message: "Unauthorized - User not authenticated" });
    }

    try {
      // Fetch classes for the teacher with course details
      const classesResult = await pool.query(
        `
      SELECT
        class.id,
        class."startTime",
        class."endTime",
        class."meetingLink",
        class."courseId",
        class."isLive",
        class."videoPath",
        course.id AS course_id, 
        course.title AS course_name,
        course.description AS course_description,
        course."teacherId" AS course_teacher_id 
      FROM class
      LEFT JOIN course ON class."courseId" = course.id
      WHERE course."teacherId" = $1
      `,
        [teacherId],
      );

      res.status(200).json(classesResult.rows);
    } catch (error) {
      console.error("Error fetching teacher's classes:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);
export const getClassById = asyncHandler(
  async (req: Request, res: Response) => {
    const classId = req.params.id;

    if (!classId || isNaN(parseInt(classId))) {
      res.status(400).json({ message: "Invalid class ID" });
      return;
    }

    try {
      const classResult = await pool.query(
        `
      SELECT
        class.id,
        class."startTime",
        class."endTime",
        class."meetingLink",
        class."courseId",
        class."isLive",
        class."videoPath",
        course.title AS course_name,
        course.description AS course_description
      FROM class
      LEFT JOIN course ON class."courseId" = course.id
      WHERE class.id = $1
      `,
        [classId],
      );

      if (classResult.rows.length > 0) {
        res.status(200).json(classResult.rows[0]);
      } else {
        res.status(404).json({ message: `Class with ID ${classId} not found` });
      }
    } catch (error) {
      console.error("Error fetching class:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);
export const updateClass = asyncHandler(
  async (req: UserRequest, res: Response) => {
    const classId = req.params.id;
    const { courseId, startTime, endTime, meetingLink, videoPath, isLive } =
      req.body;

    const teacherId = req.user?.id;

    if (!classId || isNaN(parseInt(classId))) {
      return res.status(400).json({ message: "Invalid class ID" });
    }

    try {
      const classCheckResult = await pool.query(
        `
      SELECT c.id
      FROM class c
      JOIN course co ON c."courseId" = co.id
      WHERE c.id = $1 AND co."teacherId" = $2
      `,
        [classId, teacherId],
      );
      if (classCheckResult.rows.length === 0) {
        res.status(403).json({ message: "Unauthorized to update this class" });
        return;
      }

      const updateFields = [];
      const values = [];
      let paramCount = 1;

      if (courseId !== undefined) {
        updateFields.push(`"courseId" = $${paramCount++}`);
        values.push(courseId);
      }
      if (startTime !== undefined) {
        updateFields.push(`"startTime" = $${paramCount++}`);
        values.push(startTime);
      }
      if (endTime !== undefined) {
        updateFields.push(`"endTime" = $${paramCount++}`);
        values.push(endTime);
      }
      if (meetingLink !== undefined) {
        updateFields.push(`"meetingLink" = $${paramCount++}`);
        values.push(meetingLink);
      }
      if (videoPath !== undefined) {
        updateFields.push(`"videoPath" = $${paramCount++}`);
        values.push(videoPath);
      }
      if (isLive !== undefined) {
        updateFields.push(`"isLive" = $${paramCount++}`);
        values.push(isLive);
      }

      if (updateFields.length === 0) {
        res.status(200).json({ message: "No fields to update" });
        return;
      }

      values.push(classId); // Add classId for the WHERE clause

      const updateQuery = `
      UPDATE class
      SET ${updateFields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING id, "startTime", "endTime", "meetingLink", "courseId", "isLive", "videoPath"
    `;

      const result = await pool.query(updateQuery, values);

      if (result.rows.length > 0) {
        res.status(200).json({
          message: "Class updated successfully",
          class: result.rows[0],
        });
      } else {
        res.status(404).json({ message: `Class with ID ${classId} not found` });
      }
    } catch (error) {
      console.error("Error updating class:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

export const deleteClass = asyncHandler(
  async (req: UserRequest, res: Response) => {
    const classId = req.params.id;

    const teacherId = req.user?.id;

    if (!classId || isNaN(parseInt(classId))) {
      return res.status(400).json({ message: "Invalid class ID" });
    }

    try {
      const classCheckResult = await pool.query(
        `
      SELECT c.id
      FROM class c
      JOIN course co ON c."courseId" = co.id
      WHERE c.id = $1 AND co."teacherId" = $2
      `,
        [classId, teacherId],
      );
      if (classCheckResult.rows.length === 0) {
        return res
          .status(403)
          .json({ message: "Unauthorized to delete this class" });
      }

      const result = await pool.query(
        `
      DELETE FROM class
      WHERE id = $1
      RETURNING id
      `,
        [classId],
      );

      if (result.rows.length > 0) {
        res
          .status(200)
          .json({ message: `Class with ID ${classId} deleted successfully` });
      } else {
        res.status(404).json({ message: `Class with ID ${classId} not found` });
      }
    } catch (error) {
      console.error("Error deleting class:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

export const getMyPaidClass = asyncHandler(
  async (req: UserRequest, res: Response) => {
    const userId = req.user?.id;
    const { courseId, classId } = req.body; // Added classId

    if (!userId) {
      res.status(401).json({ message: "Not Authorized" });
      return;
    }

    // Check if the user has paid for the course
    const isCoursePaid = await pool.query(
      `SELECT * FROM public.payment WHERE "userId"=$1 AND "courseId"=$2`,
      [userId, courseId],
    );

    if (isCoursePaid.rows.length === 0) {
      // Corrected check
      res.status(409).json({ message: "You have not paid for the course" });
      return;
    }

    // Check if the user is enrolled in the course
    const enrolled = await pool.query(
      `SELECT * FROM public.enrollment WHERE "studentId" = $1 AND "courseId" = $2`,
      [userId, courseId],
    );

    if (enrolled.rows.length === 0) {
      // Corrected check
      res.status(409).json({ message: "You must be enrolled in this course." });
      return;
    }

    // Now Get the Class
    try {
      const classResult = await pool.query(
        `
                SELECT
                    class.id,
                    class."startTime",
                    class."endTime",
                    class."meetingLink",
                    class."courseId",
                    class."isLive",
                    class."videoPath",
                    course.title AS course_name,
                    course.description AS course_description
                FROM class
                         LEFT JOIN course ON class."courseId" = course.id
                WHERE class.id = $1
            `,
        [classId],
      );

      if (classResult.rows.length > 0) {
        res.status(200).json(classResult.rows[0]);
      } else {
        res.status(404).json({ message: `Class with ID ${classId} not found` });
      }
    } catch (error) {
      console.error("Error fetching class:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

// NEW BACKEND ENDPOINT: To get the single latest paid class for a student
export const getLatestPaidClassForStudent = asyncHandler(
  async (req: UserRequest, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Not Authorized" });
      return;
    }

    try {
      // This query finds the latest (most recent startTime) class
      // that the user has paid for and is enrolled in.
      const result = await pool.query(
        `
            SELECT
                c.id AS class_id,
                c."courseId"
            FROM public.class c
            JOIN public.course co ON c."courseId" = co.id
            WHERE c."courseId" IN (
                SELECT p."courseId"
                FROM public.payment p
                WHERE p."userId" = $1
            )
            AND c."courseId" IN (
                SELECT e."courseId"
                FROM public.enrollment e
                WHERE e."studentId" = $1
            )
            ORDER BY c."startTime" DESC -- Orders by start time descending to get the latest
            LIMIT 1; -- Retrieves only the top (latest) one
            `,
        [userId],
      );

      if (result.rows.length > 0) {
        res.status(200).json(result.rows[0]); // Return the single class_id and courseId
      } else {
        res
          .status(404)
          .json({ message: "No paid classes found for this student to join." });
      }
    } catch (error) {
      console.error("Error fetching latest paid class for student:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);
