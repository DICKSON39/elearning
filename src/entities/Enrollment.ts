import { Entity, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import { User } from "./User";
import { Course } from "./Course";

@Entity()
export class Enrollment {

  // @ts-ignore
  @PrimaryGeneratedColumn()
  id!: number;

  // @ts-ignore
  @ManyToOne(() => User, (user) => user.enrollments, { nullable: false })
  student!: User;

  // @ts-ignore
  @ManyToOne(() => Course, (course) => course.enrollments, { nullable: false })
  course!: Course;
}
