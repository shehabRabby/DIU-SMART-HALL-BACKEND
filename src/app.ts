import cookieParser from "cookie-parser";
import cors from "cors";
import crypto from "crypto";
import express, {
  NextFunction,
  type Application,
  type Request,
  type Response,
} from "express";
import httpStatus from "http-status";
import config from "./app/config";
import { connectRedis } from "./app/lib/redis";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { AuthRoutes } from "./app/modules/auth/auth.route";
import { UserRoutes } from "./app/modules/auth/user/user.route";
import { CanteenController } from "./app/modules/canteen/canteen.controller";
import { CanteenRoutes } from "./app/modules/canteen/canteen.route";
import { DisciplineRoutes } from "./app/modules/discipline/discipline.route";
import { GatePassRoutes } from "./app/modules/gatePass/gatePass.route";
import { HallRoutes } from "./app/modules/hall/hall.route";
import { NoticeRoutes } from "./app/modules/notice/notice.route";
import { SeatRoutes } from "./app/modules/seat/seat.route";

const app: Application = express();

app.use(
  cors({
    origin: config.frontend_url,
    credentials: true,
  }),
);

// MUST come BEFORE express.json() so Stripe webhook gets the raw Buffer
app.post(
  "/api/v1/canteen/payments/stripe/webhook",
  express.raw({ type: "application/json" }),
  CanteenController.stripeWebhook,
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Ensure Redis is connected on Serverless cold starts (Vercel)
app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    await connectRedis();
    next();
  } catch (error) {
    next(error);
  }
});

app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/user", UserRoutes);
app.use("/api/v1/halls", HallRoutes);
app.use("/api/v1/seats", SeatRoutes);
app.use("/api/v1/discipline", DisciplineRoutes);
app.use("/api/v1/notices", NoticeRoutes);
app.use("/api/v1/gate-passes", GatePassRoutes);
app.use("/api/v1/canteen", CanteenRoutes);

app.post("/demo", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const otp = crypto.randomInt(100000, 1000000);
    res.status(httpStatus.OK).json({
      success: true,
      message: "Welcome to DIU SMART HALL API Server!",
      data: { otp },
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
});

app.get("/", async (req: Request, res: Response) => {
  res.status(httpStatus.OK).json({
    success: true,
    message: "Welcome to DIU SMART HALL API Server!",
    version: "1.0.0",
    institution: {
      name: "Daffodil International University",
      department: "CSE ",
      batch: "65",
      address: "Daffodil Smart City, Ashulia, Savar, Dhaka, Bangladesh",
    },
    developers: {
      backend: "Md Shehab Al Rabby",
      frontend: "Md Sakib Hossain",
    },
    serverStatus: "Active & Running Smoothly",
    timestamp: new Date().toISOString(),
  });
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
