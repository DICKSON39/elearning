import { NextFunction, Response } from "express";
import { RoleRequest } from "../../utils/types/role.types";
import { asyncHandler } from "../asyncHandler";
import { UserRequest } from "../../utils/types/user";

export const roleGuard = (allowedRoles: string[]) => {
  return asyncHandler(
    async (req: RoleRequest, res: Response, next: NextFunction) => {
      // Ensure req.user exists and then check the user's role
      if (!req.user || !allowedRoles.includes(req.user.role_name)) {
        return res
          .status(403)
          .json({ message: "Access denied: Insufficient permissions" });
      }
      next();
    },
  );
};

export const Admin = roleGuard(["Admin"]);
export const Teacher = roleGuard(["Teacher"]);
export const Student = roleGuard(["Student"]);

export const AdminOrUser = (
  req: UserRequest,
  res: Response,
  next: NextFunction,
) => {
  // Admin can update any user
  if (
    req.user?.role_name === "Admin" ||
    req.user?.id === parseInt(req.params.id)
  ) {
    return next();
  }

  res
    .status(403)
    .json({ message: "You are not authorized to update this profile" });
};

// roleMiddleware.ts
export const AdminOrTeacher = (
  req: UserRequest,
  res: Response,
  next: NextFunction,
) => {
  if (req.user?.role_name === "Admin" || req.user?.role_name === "Teacher") {
    next();
  } else {
    res
      .status(403)
      .json({ message: "Access denied: Insufficient permissions" });
  }
};
