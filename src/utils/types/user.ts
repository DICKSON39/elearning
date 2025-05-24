import { Request } from "express";

export interface User {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  roleId: number;
  role_name: string;
}

export interface UserRequest extends Request {
  user?: User;
}
