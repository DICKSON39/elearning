import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from "typeorm";
import { User } from "./User";
import { Class } from "./Class";

@Entity()
export class Attendance {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, (user) => user.attendances)
  student!: User;

  @ManyToOne(() => Class, (classSession) => classSession.attendances)
  classSession!: Class;

  @Column()
  status!: string; // "present" | "absent"

  @Column()
  timestamp!: Date;
}
