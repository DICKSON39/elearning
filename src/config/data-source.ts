import "reflect-metadata";
import { DataSource, EntitySchema } from "typeorm";
import { User } from "../entities/User";
import { Attendance } from "../entities/Attendance";

import { Payment } from "../entities/Payment";
import { Role } from "../entities/Role";
import { Enrollment } from "../entities/Enrollment";
import { Course } from "../entities/Course";
import { Class } from "../entities/Class";
import dotenv from "dotenv";
import { Certificate } from "../entities/Certificate";
import { InviteCode } from "../entities/RoleInvite.entity";
import {Video} from "../entities/Video";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  
  url: process.env.DATABASE_URL,

  
  synchronize: true,
 
  logging: false,
  entities: [
    User,
    Attendance,
    Certificate,
    Payment,
    Role,
    Enrollment,
    Course,
    Class,
    InviteCode,
      Video
  ],

  ssl: {
    rejectUnauthorized: false,
  }
});
