import express, { Router } from 'express'
import { protect } from '../middlewares/auth/protect';
import { Teacher} from '../middlewares/auth/roleMiddleware';
import {
    createClass,
    deleteClass,
    getClassById, getLatestPaidClassForStudent,
    getMyPaidClass,
    getTeacherClasses,
    updateClass
} from '../controllers/classController';


const router = Router();

router.post('/class',protect,Teacher,createClass);
router.get('/class/teacher/:teacherId',protect,Teacher,getTeacherClasses)
router.get('/class/:id',protect,getClassById)
router.put('/class/:id',protect,Teacher,updateClass) 
router.delete('/class/:id',protect,Teacher,deleteClass)
router.post('/class/paid', protect, getMyPaidClass);
router.get('/class/latest-paid',protect,getLatestPaidClassForStudent)

export default router;