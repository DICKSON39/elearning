import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler";
import pool from "../config/db.config";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/helpers/generateToken";

// Register User
export const registerUser = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, password, phoneNumber, roleId } = req.body;

    // Check if user with the given email already exists
    const userEmailExists = await pool.query(
      "SELECT id FROM public.user WHERE email = $1",
      [email]
    );

    if (userEmailExists.rows.length > 0) {
      res.status(400).json({ message: "User with this email already exists" });
      return;
    }

    // Check if user with the given phone number already exists
    const userPhoneExists = await pool.query(
      'SELECT id FROM public.user WHERE "phoneNumber" = $1', // Use double quotes for case sensitivity
      [phoneNumber]
    );

    if (userPhoneExists.rows.length > 0) {
      res
        .status(400)
        .json({ message: "User with this phone number already exists" });
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into database
    const newUser = await pool.query(
      `INSERT INTO public.user (name, email, password, "phoneNumber", "roleId")
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, name, email, "phoneNumber", "roleId"`,
      [name, email, hashedPassword, phoneNumber, roleId]
    );

    // Generate JWT token
    await generateToken(res, newUser.rows[0].id, newUser.rows[0].roleId);

    res.status(201).json({
      message: "User registered successfully",
      user: newUser.rows[0],
    });
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
