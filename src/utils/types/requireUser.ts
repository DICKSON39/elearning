// types/requireUser.ts
import { User } from './user';
import { Request } from 'express';

export interface RequireUser extends Request {
  user: User; // Required, not optional
}
