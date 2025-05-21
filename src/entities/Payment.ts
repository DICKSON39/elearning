import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { User } from "./User";
import { Course } from "./Course";
@Entity()
export class Payment {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, (user) => user.payments)
  user!: User;

  @ManyToOne(() => Course, (course) => course.payments)
  course!: Course;

  @Column("decimal", { precision: 10, scale: 2 })
  amount!: number;

  @Column()
  status!: string; // "paid" | "pending" | "failed"

  @Column()
  paymentDate!: Date;

  @Column({ nullable: true })
  checkoutRequestID?: string;
}



