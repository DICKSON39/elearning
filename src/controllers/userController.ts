import express, { Request, Response } from 'express';
import pool from '../config/db.config';
import { asyncHandler } from '../middlewares/asyncHandler';
import { UserRequest } from '../utils/types/user';
import bcrypt from 'bcryptjs';
export const getUserProfile = async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);

  if (isNaN(userId)) {
     res.status(400).json({ error: 'Invalid user ID' });
     return;
  }

  try {
    const result = await pool.query(
      `SELECT id, name, email, "phoneNumber", "roleId" AS role_id FROM public.user WHERE id = $1`,
      [userId]
    );

    if (result.rows.length > 0) {
       res.status(200).json({
        id: result.rows[0].id,
        name: result.rows[0].name,
        email: result.rows[0].email,
        phoneNumber: result.rows[0].phoneNumber, // Include phoneNumber here
        roleId: result.rows[0].role_id,
      });
      return;
    } else {
       res.status(404).json({ message: 'User not found' });
       return;
    }
  } catch (error: any) {
     res.status(500).json({ error: error.message });
     return;
  }
};
export const getUsers = asyncHandler(async (req: UserRequest, res: Response) => {
    const result = await pool.query(
      `SELECT id AS user_id, name, email, "roleId" AS role_id, "phoneNumber" FROM public.user ORDER BY id ASC`
    );
    res.status(200).json(result.rows.map(row => ({
      id: row.user_id,
      name: row.name,
      email: row.email,
      roleId: row.role_id,
      phoneNumber: row.phoneNumber,
    })));
  });
export const deleteUsers = asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id); // Assuming your route defines the user ID as ':id'
  
    if (isNaN(userId)) {
       res.status(400).json({ error: 'Invalid user ID in the route' });
       return
    }
  
    const result = await pool.query("SELECT * FROM public.user WHERE id = $1", [userId]); // Use 'id' as per your schema
  
    if (result.rows.length === 0) {
      res.status(404).json({ message: "😒 User not found" });
      return
    }
  
    await pool.query("DELETE FROM public.user WHERE id = $1", [userId]); // Use 'id' as per your schema
  
    res.status(200).json({ message: `✅ User with ID ${userId} deleted successfully` });
  });
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, phoneNumber, roleId, password } = req.body;
    const userId = parseInt(req.params.id); // Use the user ID from the URL
  
    // Check if the user exists
    const userCheck = await pool.query('SELECT * FROM public.user WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
  
    // Optionally validate role_id
    let roleIdVal: number | null = null;
    if (roleId !== undefined) {
      roleIdVal = Number(roleId);
      if (isNaN(roleIdVal)) {
        res.status(400).json({ message: 'Invalid role_id: must be a number' });
        return;
      }
    }
  
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
  
    // Required fields
    fields.push(`name = $${paramIndex++}`);
    values.push(name);
    fields.push(`email = $${paramIndex++}`);
    values.push(email);
    fields.push(`"phoneNumber" = $${paramIndex++}`);
    values.push(phoneNumber);
  
    // Optional roleId
    if (roleIdVal !== null) {
      fields.push(`"roleId" = $${paramIndex++}`);
      values.push(roleIdVal);
    }
  
    // Optional password
    if (password) {
      if (password.length < 6) {
        res.status(400).json({ message: 'Password must be at least 6 characters' });
        return;
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      fields.push(`password = $${paramIndex++}`);
      values.push(hashedPassword);
    }
  
    // Add WHERE clause
    values.push(userId); // Use the userId from the URL
  
    const updated = await pool.query(
      `UPDATE public.user
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id AS user_id, name, email, "phoneNumber", "roleId" AS role_id`,
      values
    );
  
    res.status(200).json({
      message: '✅ User updated successfully',
      user: updated.rows[0],
    });
    return;
  });
export const getAllTeachers = asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query(`
    SELECT u.id, u.name, u.email, r.name AS role_name
    FROM public.user u
    JOIN public.role r ON u."roleId" = r.id
    WHERE r.name = 'Teacher'
  `);
  
  res.status(200).json(result.rows);
});
export const getTeacherById = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId } = req.params; // Assuming the teacher ID is passed as a URL parameter

  try {
    const teacherQuery = await pool.query(
      `
      SELECT u.id, u.name, u.email
      FROM public.user u
      WHERE u.id = $1
      `,
      [teacherId]
    );

    if (teacherQuery.rows.length === 0) {
       res.status(404).json({ message: 'Teacher not found' });
       return;
    }

    res.status(200).json(teacherQuery.rows[0]);
  } catch (error) {
    console.error('Error fetching teacher:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


