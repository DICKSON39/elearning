import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Course } from "./Course";
import { Enrollment } from "./Enrollment";
import { Payment } from "./Payment";
import { Attendance } from "./Attendance";
import { Certificate } from "./Certificate";
import { Role } from './Role';



@Entity()

export class User {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;

    @Column()
    email!: string;

    @Column()
    password!: string;

  

    @Column({ unique: true })
    phoneNumber!: string

    @ManyToOne(() => Role, (role) => role.users)
    @JoinColumn({ name: 'roleId' })
    role!: Role;

    @OneToMany(() => Course, (course) => course.Teacher)
    courses!: Course[];

    @OneToMany(() => Enrollment, (enrollment) => enrollment.student)
    enrollments!: Enrollment[];

    @OneToMany(() => Payment, (payment) => payment.user)
    payments!: Payment[];

    @OneToMany(() => Attendance, (attendance) => attendance.student)
    attendances!: Attendance[];
   
    @OneToMany(() => Certificate, (certificate) => certificate.student)
    certificates!: Certificate[];
    
}