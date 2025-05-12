import express from 'express';
import { enrollUser } from '../controllers/enrollmentController';
import { protect } from '../middlewares/auth/protect';
import { Admin } from '../middlewares/auth/roleMiddleware';

const router = express.Router();

router.post('/enroll',protect,Admin, enrollUser);



export default router;