import { Entity, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import { User } from "./User";
import { Course } from "./Course";

@Entity()
export class Enrollment {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, (user) => user.enrollments, { nullable: false })
  student!: User;

  @ManyToOne(() => Course, (course) => course.enrollments, { nullable: false })
  course!: Course;
}
