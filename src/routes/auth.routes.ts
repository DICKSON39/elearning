import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/authController";


const router = Router();


router.post('/register',registerUser);
router.post('/login',loginUser);
router.post('/logout',logoutUser);

//console.log("✅ Auth routes loaded");


export default router

