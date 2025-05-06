import express from 'express';
import { protect } from '../middlewares/auth/protect';
import { getPaymentById, getPaymentDetails, getPayments, getStudentPayments, makePayment } from '../controllers/paymentController';
import { Admin } from '../middlewares/auth/roleMiddleware';

const router = express.Router();

router.post('/:userId/payment',protect,makePayment);
router.get('/:userId/payments',protect,getPayments);
router.get('/:userId/payment/:paymentId',protect,getPaymentById);
router.get('/payment-info',protect,Admin,getPaymentDetails)
router.get('/my-payments',protect,getStudentPayments)


export default router;;