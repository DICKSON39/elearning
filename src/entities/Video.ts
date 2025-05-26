import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Class } from "./Class";

@Entity()
export class Video {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  url!: string; // Supabase storage path or public URL

  @Column({ nullable: true })
  title?: string; // optional, if you want to name the video

  @ManyToOne(() => Class, (classSession) => classSession.videos, {
    onDelete: "CASCADE",
  })
  classSession!: Class;
}
