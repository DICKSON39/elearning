import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, JoinColumn } from "typeorm";
import { User } from "./User";
import { Course } from "./Course";

@Entity()
export class Certificate {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, (user) => user.certificates)
  student!: User;

  @ManyToOne(() => Course, (course) => course.certificates)
  @JoinColumn({ name: 'courseId' })
  course!: Course;

  @Column()
  issuedDate!: Date;
}
