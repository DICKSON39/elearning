import express, { Request, Response } from "express";
import pool from "../config/db.config";
import { asyncHandler } from "../middlewares/asyncHandler";
import { UserRequest } from "../utils/types/user";
import Stripe from "stripe";
import { generateToken, initiateSTKPush } from "../utils/mpesa";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});
export const makePayment = asyncHandler(
  async (req: UserRequest, res: Response) => {
    const userId = req.user?.id;
    const { courseId, paymentMethod, phoneNumber } = req.body;

    if (!userId) {
      res.status(400).json({ message: "Missing userId." });
      return;
    }

    if (!courseId) {
      res.status(400).json({ message: "Missing courseId." });
      return;
    }

    // Get course price early
    const courseResult = await pool.query(
      `SELECT id, price FROM public.course WHERE id = $1`,
      [courseId],
    );

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ message: "Course not found." });
    }

    const coursePrice = parseFloat(courseResult.rows[0].price); // price in number

    if (paymentMethod === "mpesa") {
      const token = await generateToken();
      const stkResponse = await initiateSTKPush(
        token,
        phoneNumber,
        coursePrice,
      );

      // Extract CheckoutRequestID from M-Pesa response
      const checkoutRequestID = stkResponse.CheckoutRequestID;

      // Save payment with 'pending' status and checkoutRequestID
      await pool.query(
        `INSERT INTO public.payment ("userId", "courseId", amount, status, "paymentDate", "checkoutRequestID")
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          courseId,
          coursePrice,
          "pending",
          new Date(),
          checkoutRequestID,
        ],
      );

      res.status(200).json({
        message: "M-Pesa STK Push initiated.",
        data: stkResponse,
      });
      return;
    }

    // Role check
    const userRoleQuery = `
            SELECT u."roleId", r.name AS role_name
            FROM public."user" u
                     JOIN public.role r ON u."roleId" = r.id
            WHERE u.id = $1
        `;
    const userRoleResult = await pool.query(userRoleQuery, [userId]);
    const userRole = userRoleResult.rows[0]?.role_name;

    if (userRole !== "Student") {
      res.status(403).json({ message: "Only students can make payments." });
      return;
    }

    // Check if already paid
    const checkPayment = await pool.query(
      `SELECT * FROM public.payment WHERE "userId" = $1 AND "courseId" = $2`,
      [userId, courseId],
    );

    if (checkPayment.rows.length > 0) {
      res.status(400).json({ message: "Already paid for this course." });
      return;
    }

    // Stripe logic
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(coursePrice * 100),
      currency: "usd",
      metadata: {
        userId: userId.toString(),
        courseId: courseId.toString(),
      },
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      message: "Payment initiated. Complete on client.",
    });
  },
);

export const mpesaCallback = asyncHandler(
  async (req: Request, res: Response) => {
    const callbackData = req.body;
    const stkCallback = callbackData.Body?.stkCallback;
    if (!stkCallback) {
      res.status(400).json({ message: "Invalid callback data" });
      return;
    }

    const resultCode = stkCallback.ResultCode;
    const checkoutRequestID = stkCallback.CheckoutRequestID;

    // Fetch the payment info from DB by CheckoutRequestID
    const paymentResult = await pool.query(
      `SELECT * FROM public.payment WHERE "checkoutRequestID" = $1`,
      [checkoutRequestID],
    );

    if (paymentResult.rows.length === 0) {
      res.status(404).json({ message: "Payment record not found" });
      return;
    }

    const payment = paymentResult.rows[0];
    const userId = payment.userId;
    const courseId = payment.courseId;

    if (resultCode === 0) {
      // Payment success - update payment status
      await pool.query(`UPDATE public.payment SET status = $1 WHERE id = $2`, [
        "paid",
        payment.id,
      ]);

      // Enroll student if not already enrolled
      const enrolled = await pool.query(
        `SELECT * FROM public.enrollment WHERE "studentId" = $1 AND "courseId" = $2`,
        [userId, courseId],
      );

      if (enrolled.rows.length === 0) {
        await pool.query(
          `INSERT INTO public.enrollment ("studentId", "courseId") VALUES ($1, $2)`,
          [userId, courseId],
        );
      }

      res
        .status(200)
        .json({ message: "Payment confirmed and student enrolled." });
      return;
    } else {
      // Payment failed or cancelled - update status
      await pool.query(`UPDATE public.payment SET status = $1 WHERE id = $2`, [
        "failed",
        payment.id,
      ]);
      res.status(200).json({ message: "Payment failed or cancelled." });
      return;
    }
  },
);

export const confirmPayment = asyncHandler(
  async (req: UserRequest, res: Response) => {
    const userId = req.user?.id;
    const { courseId, paymentIntentId } = req.body;

    if (!userId || !courseId || !paymentIntentId) {
      res.status(400).json({ message: "Missing required info." });
      return;
    }

    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status !== "succeeded") {
      res.status(400).json({ message: "Payment not successful." });
      return;
    }

    try {
      const paymentDate = new Date();

      const paymentResult = await pool.query(
        `INSERT INTO public.payment ("userId", "courseId", amount, status, "paymentDate")
             VALUES ($1, $2, $3, 'paid', $4) RETURNING *`,
        [userId, courseId, intent.amount / 100, paymentDate],
      );

      // Check if already enrolled
      const enrolled = await pool.query(
        `SELECT * FROM public.enrollment WHERE "studentId" = $1 AND "courseId" = $2`,
        [userId, courseId],
      );
      if (enrolled.rows.length > 0) {
        res.status(409).json({ message: "Already enrolled in this course." });
        return;
      }

      const enrollment = await pool.query(
        `INSERT INTO public.enrollment ("studentId", "courseId") VALUES ($1, $2) RETURNING *`,
        [userId, courseId],
      );

      res.status(200).json({
        message: "Payment confirmed and student enrolled.",
        payment: paymentResult.rows[0],
        enrollment: enrollment.rows[0],
      });
      return;
    } catch (error) {
      console.error("DB Insert Error:", error); // Log it
      res.status(500).json({ message: "Payment success, but saving failed." });
      return;
    }
  },
);
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
  },
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
  },
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
  },
);
export const getStudentPayments = asyncHandler(
  async (req: UserRequest, res: Response) => {
    const userId = req.user?.id;
    const courseId = req.query.courseId
      ? parseInt(req.query.courseId as string, 10)
      : null;

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
      res
        .status(500)
        .json({ message: "Error fetching student payments", error });
    }
  },
);

