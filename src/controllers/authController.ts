import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler";
import pool from "../config/db.config";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/helpers/generateToken";
import {validateInviteCode,markInviteCodeAsUsed} from "../services/auth.service";

// Register User

export const registerUser = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const client = await pool.connect();

        try {
            const { name, email, password, phoneNumber, roleId, inviteCode } = req.body;

            // Basic validation
            if (!name || !email || !password || !phoneNumber) {
                 res.status(400).json({ message: "All fields are required" });
                return
            }

            // Default to student role if roleId isn't provided
            let roleIdToUse = roleId || 3;

            // If invite code is provided, validate and get its role
            if (inviteCode) {
                const inviteResult = await client.query(
                    `SELECT * FROM public.invite_code WHERE code = $1`,
                    [inviteCode]
                );


                if (inviteResult.rows.length === 0) {
                     res.status(400).json({ message: "Invalid or already used invite code" });
                    return
                }

                // Override roleId from the invite
                roleIdToUse = inviteResult.rows[0].roleId;
            }

            // Check for duplicate email
            const emailCheck = await client.query(
                `SELECT id FROM public.user WHERE email = $1`,
                [email]
            );
            if (emailCheck.rows.length > 0) {
                 res.status(400).json({ message: "User with this email already exists" });
                return
            }

            // Check for duplicate phone number
            const phoneCheck = await client.query(
                `SELECT id FROM public.user WHERE "phoneNumber" = $1`,
                [phoneNumber]
            );
            if (phoneCheck.rows.length > 0) {
                 res.status(400).json({ message: "User with this phone number already exists" });
                return
            }

            // Begin DB transaction
            await client.query('BEGIN');

            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert new user
            const insertUserResult = await client.query(
                `INSERT INTO public.user (name, email, password, "phoneNumber", "roleId")
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id, name, email, "phoneNumber", "roleId"`,
                [name, email, hashedPassword, phoneNumber, roleIdToUse]
            );

            const newUser = insertUserResult.rows[0];

            // If invite code used, mark it as used


            // Commit DB transaction
            await client.query('COMMIT');

            // Generate JWT token
            await generateToken(res, newUser.id, newUser.roleId);

            // Return success
             res.status(201).json({
                message: "User registered successfully",
                user: newUser,
            });
            return

        } catch (error) {
            await client.query('ROLLBACK');
            console.error("Registration error:", error);
             res.status(500).json({ message: "Server error" });
            return
        } finally {
            client.release();
        }
    }
);
// Login User
export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const userQuery = await pool.query(
    `SELECT id, name, email, password, "phoneNumber", "roleId"
       FROM public.user
       WHERE email = $1`,
    [email]
  );

  if (userQuery.rows.length === 0) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  const user = userQuery.rows[0];

 

  const isMatch = await bcrypt.compare(password, user.password);
 
  if (!isMatch) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  // Generate JWT token
  const { accessToken } = await generateToken(res, user.id, user.roleId); // Capture the returned accessToken

  // console.log(`accessToken111: ${accessToken}`);
  res.status(200).json({
    message: "Login successful",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      phoneNumber: user.phoneNumber,
    },
    accessToken: accessToken,
  });
});

// Logout User
export const logoutUser = asyncHandler(async (req: Request, res: Response) => {
  res.cookie("access_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "strict",
    expires: new Date(0),
  });

  res.cookie("refresh_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "strict",
    expires: new Date(0),
  });

  res.status(200).json({ message: "User logged out successfully" });
});
