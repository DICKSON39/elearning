import express, { Request, Response } from "express";
import pool from "../config/db.config";
import { asyncHandler } from "../middlewares/asyncHandler";
import { UserRequest } from "../utils/types/user";
import { constrainedMemory } from "process";

export const makePayment = asyncHandler(
    async (req: UserRequest, res: Response) => {
      const userId = req.user?.id;
      const { courseId, amount } = req.body;
      const paymentDate = new Date();
  
      // Input validation: Check for required fields
      if (!courseId || !amount) {
        return res
          .status(400)
          .json({
            message: "Missing required fields: courseId and amount are required.",
          });
      }
  
      // 1. Get the user's role ID and role name
      const userRoleQuery = `
        SELECT u."roleId", r.name AS role_name
        FROM public."user" u
        JOIN public.role r ON u."roleId" = r.id  -- Join with the role table
        WHERE u.id = $1
      `;
      const userRoleValues = [userId];
  
      try {
        const userRoleResult = await pool.query(userRoleQuery, userRoleValues);
        if (userRoleResult.rows.length === 0) {
           res.status(404).json({ message: "User not found." }); // User not found
           return
        }
        const userRole = userRoleResult.rows[0].role_name; // Get the role name
  
        if (userRole !== "Student") {
          res.status(403).json({ message: "Only students can make payments." });
          return
        }
      } catch (error) {
        console.error("Error checking user role:", error);
        res.status(500).json({ message: "Error checking user role", error });
        return
      }
  
      // 2. Get the course price
      const coursePriceQuery = `
        SELECT price FROM public.course WHERE id = $1
      `;
      const coursePriceValues = [courseId];
  
      try {
        const coursePriceResult = await pool.query(
          coursePriceQuery,
          coursePriceValues
        );
        if (coursePriceResult.rows.length === 0) {
          res.status(404).json({ message: "Course not found." });
          return
        }
        const coursePrice = parseFloat(coursePriceResult.rows[0].price); // Ensure coursePrice is a number
  
        // Convert amount to a number and validate
        const paymentAmount = parseFloat(amount);
        if (isNaN(paymentAmount)) {
          return res.status(400).json({ message: "Invalid payment amount. Must be a valid number." });
        }
  
        // 3. Check if the payment amount matches the course price
        if (paymentAmount !== coursePrice) {
           res
            .status(400)
            .json({ message: "Payment amount does not match the course price." });
            return
        }
      } catch (error) {
        console.error("Error fetching course price:", error);
        res.status(500).json({ message: "Error fetching course price", error });
        return
      }
  
      // 4. Check if the user has already paid for the course
      const checkQuery = `
          SELECT * FROM public.payment WHERE "userId" = $1 AND "courseId" = $2
        `;
      const checkValues = [userId, courseId];
  
      try {
        const checkResult = await pool.query(checkQuery, checkValues);
        if (checkResult.rows.length > 0) {
          res.status(400).json({ message: "Already paid for this course" });
          return
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
         res.status(500).json({ message: "Error checking payment status", error });
         return
      }
  
      // If all checks pass, proceed with payment creation
      try {
        const result = await pool.query(
          `INSERT INTO public.payment ("userId", "courseId", amount, status, "paymentDate")
            VALUES ($1, $2, $3, 'paid', $4) RETURNING *`, //  Set status to 'paid'
          [userId, courseId, amount, paymentDate]
        );
  
        res.status(201).json(result.rows[0]);
      } catch (error) {
        console.error("Error processing payment:", error);
        res.status(500).json({ message: "Error processing payment", error });
      }
    }
  );;
export const getPayments = asyncHandler(
  async (req: UserRequest, res: Response) => {
    const userId = req.user?.id;

    // Input validation:  Check for the presence of userId
    if (!userId) {
      res.status(400).json({ message: "Missing user ID" }); // Or 401 Unauthorized, depending on your auth flow
      return;
    }

    const query = `
      SELECT
        p.id AS payment_id,
        p.amount,
        p.status,
        p."paymentDate",
        c.id AS course_id,
        c.title AS course_title
      FROM public.payment p
      JOIN public.course c ON p."courseId" = c.id
      WHERE p."userId" = $1
      ORDER BY p."paymentDate" DESC; 
    `;
    const values = [userId];

    try {
      const result = await pool.query(query, values);

      //  Structure the response for consistency and clarity.
      const payments = result.rows.map((row) => ({
        payment_id: row.payment_id,
        amount: row.amount,
        status: row.status,
        paymentDate: row.paymentDate,
        course: {
          course_id: row.course_id,
          course_title: row.course_title,
        },
      }));
      res.status(200).json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ message: "Error fetching payments", error });
    }
  }
);

export const getPaymentById = asyncHandler(
  async (req: UserRequest, res: Response) => {
    const userId = req.user?.id;
    const paymentId = req.params.id;

    // Input validation: Ensure both userId and paymentId are present and valid
    if (!userId || !paymentId) {
      res.status(400).json({ message: "Missing user ID or payment ID" });
      return;
    }

    //  Important:  Always parse route parameters (like paymentId) as integers
    const parsedPaymentId = parseInt(paymentId, 10);

    if (isNaN(parsedPaymentId)) {
      res.status(400).json({ message: "Invalid payment ID format" });
      return;
    }
    const query = `
      SELECT
        p.id AS payment_id,
        p.amount,
        p.status,
        p."paymentDate",
        u.id AS user_id,
        u.name AS user_name,
        c.id AS course_id,
        c.title AS course_title
      FROM public.payment p
      JOIN public."user" u ON p."userId" = u.id
      JOIN public.course c ON p."courseId" = c.id
      WHERE p."userId" = $1 AND p.id = $2;
    `;
    const values = [userId, parsedPaymentId];

    try {
      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        res.status(404).json({ message: "Payment not found" });
        return;
      }

      //  Include user and course data in the response.
      const payment = result.rows[0];
      const response = {
        payment_id: payment.payment_id,
        amount: payment.amount,
        status: payment.status,
        paymentDate: payment.paymentDate,
        user: {
          user_id: payment.user_id,
          user_name: payment.user_name,
        },
        course: {
          course_id: payment.course_id,
          course_title: payment.course_title,
        },
      };
      res.status(200).json(response);
    } catch (error) {
      console.error("Error fetching payment:", error);
      res.status(500).json({ message: "Error fetching payment", error });
    }
  }
);

export const getPaymentDetails = asyncHandler(
  async (req: UserRequest, res: Response) => {
    const userId = req.user?.id;

    try {
      const query = `
         SELECT
          p.id AS payment_id,
          p.amount,
          p.status AS payment_status,
          p."paymentDate",
          u.id AS user_id,
          u.name AS user_name,
          u.email AS user_email,
          c.id AS course_id,
          c.title AS course_title,
          c.description AS course_description
        FROM payment p
        JOIN "user" u ON p."userId" = u.id  -- Corrected join for userId
        JOIN course c ON p."courseId" = c.id -- Corrected join for courseId
        ORDER BY p.id;
        `;

      const result = await pool.query(query);
      const paymentDetails = result.rows.map((row: any) => ({
        paymentId: row.payment_id,
        amount: row.amount,
        status: row.payment_status,
        paymentDate: row.paymentDate,
        userId: row.user_id,
        userName: row.user_name,
        userEmail: row.user_email,
        courseId: row.course_id,
        courseTitle: row.course_title,
        courseDescription: row.course_description,
      }));
      res.status(200).json(paymentDetails);
    } catch (error) {
      console.error("Error fetching payment information:", error);
      res
        .status(500)
        .json({ message: "Failed to fetch payment information", error });
    }
  }
);


export const getStudentPayments = asyncHandler(async (req: UserRequest, res: Response) => {
  const userId = req.user?.id;
  const courseId = req.query.courseId ? parseInt(req.query.courseId as string, 10) : null;

  try {
    let query = `
      SELECT 
        p.id AS "paymentId",
        p.amount,
        p.status,
        p."paymentDate",
        u.id AS "userId",
        u.name AS "userName",
        u.email AS "userEmail",
        c.id AS "courseId",
        c.title AS "courseTitle",
        c.description AS "courseDescription"
      FROM public.payment p
      JOIN public."user" u ON p."userId" = u.id
      JOIN public.course c ON p."courseId" = c.id
      WHERE u.id = $1
    `;

    const params: any[] = [userId];

    // If courseId is provided, add it to the query
    if (courseId) {
      query += ` AND c.id = $2`;
      params.push(courseId);
    }

    query += ` ORDER BY p."paymentDate" DESC`;

    const result = await pool.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching student payments:", error);
    res.status(500).json({ message: "Error fetching student payments", error });
  }
});
