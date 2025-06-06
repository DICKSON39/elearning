import express from "express";
import { AppDataSource } from "./config/data-source";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import courseRoutes from "./routes/course.routes";
import teacherRoutes from "./routes/teacher.routes";
import classRoutes from "./routes/class.routes";

import paymentRoutes from "./routes/payment.routes";
import enrollmentRoutes from "./routes/enrollment.routes";
// import { seedInviteCodes } from "./seeders/inviteCode.seed";
import dashRoutes from "./routes/analytics.routes";
//import { createDefaultRoles } from "./seeders/seedRoles";

dotenv.config();

const app = express();
const PORT = process.env.PORT;

app.use(express.json());
app.use(morgan("dev"));

const allowedOrigins = ["https://online-courses-gamma.vercel.app"];

app.use(
  cors({
    origin: (origin: string | undefined, callback: Function) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

//Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/courses", courseRoutes);
app.use("/api/v1/teachers", teacherRoutes);
app.use("/api/v1", classRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/enrollment", enrollmentRoutes);
app.use("/api/v1/dashboard", dashRoutes);





//console.log("Static image path:", path.join(__dirname, 'uploads', 'courses'));
// Log incoming requests (for debugging)
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);

  next();
});

AppDataSource.initialize().then(async () => {
  console.log(`Data source has been initialized`);

  //await seedInviteCodes();
  // await createDefaultRoles();
  

  app.listen(PORT, () => console.log(`✅✅Port 👌👌👌is running ${PORT} `));
});

