import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { Course } from "./Course";
import { Attendance } from "./Attendance";
import { Video } from "./Video";

@Entity()
export class Class {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Course, (course) => course.classes)
  course!: Course;

  @Column()
  Description!:string;

  

  

  @OneToMany(() => Attendance, (attendance) => attendance.classSession)
  attendances!: Attendance[];

  @OneToMany(() => Video, (video) => video.classSession, {cascade: true})
  videos!: Video[];
}




