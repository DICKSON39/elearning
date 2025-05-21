import 'reflect-metadata';
import { DataSource, EntitySchema } from "typeorm"
import { User } from '../entities/User';
import { Attendance } from '../entities/Attendance';

import { Payment } from '../entities/Payment';
import { Role } from '../entities/Role';
import { Enrollment } from '../entities/Enrollment';
import { Course } from '../entities/Course';
import { Class } from '../entities/Class';
import dotenv from 'dotenv'
import { Certificate } from '../entities/Certificate';

dotenv.config();


export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password:process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    synchronize:true,
    logging:false,
    entities: [User,Attendance,Certificate,Payment,Role,Enrollment,Course,Class],

    ssl: false,

    
})


