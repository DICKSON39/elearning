import jwt from "jsonwebtoken";
import pool from "../../config/db.config";
import { asyncHandler } from "../asyncHandler";
import { UserRequest } from "../../utils/types/user";
import { NextFunction, Response } from "express";

export const protect = asyncHandler(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      res.status(401).json({ message: "No token provided" });
      return;
    }

    if (!token && req.cookies?.access_token) {
      token = req.cookies.access_token;
    }

    try {
      // console.log("Token Received", token)

      if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in env variables");
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
        userId: string;
        roleId: number;
      };
      // console.log("✅ Token decoded:", decoded);

      const userQuery = await pool.query(
        ` SELECT 
            "user".id, 
            "user".name, 
            "user".email, 
            "user"."roleId", 
            role.name AS role_name
          FROM "user"
          JOIN role ON "user"."roleId" = role.id
          WHERE "user".id = $1
        `,
        [decoded.userId],
      );

      if (userQuery.rows.length === 0) {
        res.status(401).json({ message: "User not found" });
        return;
      }

      req.user = userQuery.rows[0];
      next();
    } catch (error) {
      console.error("JWT Error:", error);
      res.status(401).json({ message: "Not authorized, token failed" });
      return;
    }
  },
);
