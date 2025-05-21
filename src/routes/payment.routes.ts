import express from "express";
import { protect } from "../middlewares/auth/protect";
import {
  confirmPayment,
  getPaymentById,
  getPaymentDetails,
  getPayments,
  getStudentPayments,
  makePayment, mpesaCallback,
} from "../controllers/paymentController";
import { Admin } from "../middlewares/auth/roleMiddleware";
import Stripe from "stripe";
import cors from "cors";
const app = express();

app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

const router = express.Router();



// 🟢 Create a PaymentIntent and return client_secret
router.post("/create-payment-intent", protect, async (req, res) => {
  const { courseId, amount } = req.body;
  //console.log("Incoming payment request:", req.body);

  if (!courseId || !amount) {
    res.status(400).json({ message: "courseId and amount are required" });
    return;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Stripe uses smallest currency unit (e.g., cents)
      currency: "kes",
      metadata: { courseId: String(courseId || "") },
    });

    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ message: "Failed to create payment intent" });
  }
});
router.post("/:userId/confirmPayment", protect, confirmPayment);
router.post("/payment/make-payment", protect, makePayment);
router.post('/callback',protect,mpesaCallback);
router.get("/:userId/payments", protect, getPayments);
router.get("/:userId/payment/:paymentId", protect, getPaymentById);
router.get("/payment-info", protect, Admin, getPaymentDetails);
router.get("/my-payments", protect, getStudentPayments);

export default router;
