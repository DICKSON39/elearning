import jwt from 'jsonwebtoken';
import { Response } from 'express';
import dotenv from 'dotenv';

dotenv.config();

// Debugging - Checking if env var are loaded correctly
// console.log('This is the JWT_SECRET', process.env.JWT_SECRET)
// console.log('REFRESH_TOKEN_SECRET', process.env.REFRESH_TOKEN_SECRET)

export const generateToken = (res: Response, userId: string, roleId: number) => {
  const jwtSecret = process.env.JWT_SECRET;
  const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET; // Corrected variable name for clarity

  if (!jwtSecret || !refreshTokenSecret) {
    throw new Error("JWT_SECRET or REFRESH_TOKEN_SECRET is not defined");
  }

  try {
    // Lets generate a short-lived access token for 15 minutes
    const accessToken = jwt.sign({ userId, roleId }, jwtSecret, { expiresIn: "15min" });

    // Lets generate a long-lived refresh token that will last for 30 days
    // We don't pass the roleId for security purposes...
    const refreshToken = jwt.sign({ userId }, refreshTokenSecret, { expiresIn: "30d" });

    // Set Access token as HTTP-Only secure cookie
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development", // Secure in production
      sameSite: "strict",
      maxAge: 30 * 60 * 1000, 
    });

    // Set Refresh Token as HTTP-Only Secure Cookie
    res.cookie("refresh_token", refreshToken, { // <---- CORRECTED: Using the refreshToken variable
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development", // Secure for production
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return { accessToken, refreshToken };

  } catch (error) {
    console.error("Error generating JWT:", error);
    throw new Error("Error generating authentication tokens");
  }
};