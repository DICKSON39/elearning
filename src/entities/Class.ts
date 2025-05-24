import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { Course } from "./Course";
import { Attendance } from "./Attendance";

@Entity()
export class Class {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Course, (course) => course.classes)
  course!: Course;

  @Column()
  startTime!: Date;

  @Column()
  endTime!: Date;

  @Column()
  meetingLink!: string;

  @OneToMany(() => Attendance, (attendance) => attendance.classSession)
  attendances!: Attendance[];
  @Column({ default: false })
  isLive!: boolean; // Whether the class is currently live

  @Column({ nullable: true })
  videoPath?: string;
}
