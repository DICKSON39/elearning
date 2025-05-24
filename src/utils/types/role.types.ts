import { Request } from "express";

export interface UserRole {
  id: number;
  name: string; // match the `name` column in the role table
}

export interface RoleRequest extends Request {
  user?: {
    id: number; // number, as from DB
    name: string;
    email: string;
    roleId: number; // match "roleId" from table (not "role_id")
    role_name: string; // from SELECT alias in protect middleware
  };
}
