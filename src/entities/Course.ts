import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./User";
import { Class } from "./Class";
import { Enrollment } from "./Enrollment";
import { Payment } from "./Payment";
import { Certificate } from "./Certificate";

@Entity()
export class Course {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column()
  description!: string;

  @Column("decimal", { precision: 10, scale: 2 })
  price!: number;

  // ✅ New column for course image (e.g. URL or file path)
  @Column({ nullable: true })
  imageUrl!: string;

  @ManyToOne(() => User, (user) => user.courses)
  @JoinColumn({ name: "teacherId" })
  Teacher!: User;

  @OneToMany(() => Class, (classSession) => classSession.course)
  classes!: Class[];

  @OneToMany(() => Enrollment, (enrollment) => enrollment.course)
  enrollments!: Enrollment[];

  @OneToMany(() => Payment, (payment) => payment.course)
  payments!: Payment[];

  @OneToMany(() => Certificate, (certificate) => certificate.course)
  certificates!: Certificate[];
}
