import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
	type Application,
	type Request,
	type Response,
} from "express";
import httpStatus from "http-status";
import config from "./app/config";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { AuthRoutes } from "./app/modules/auth/auth.route";

const app: Application = express();

app.use(
	cors({
		origin: config.frontend_url,
		credentials: true,
	}),
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/auth", AuthRoutes);

// Basic route
app.get("/", async (req: Request, res: Response) => {
	res.status(httpStatus.OK).json({
		success: true,
		message: "Welcome to DIU SMART HALL API Server! 🚀",
		version: "1.0.0",
		institution: {
			name: "Daffodil International University",
			department: "CSE Department",
			batch: "65",
			address: "Daffodil Smart City, Ashulia, Savar, Dhaka, Bangladesh",
		},
		developers: {
			backend: "Md Shehab Al Rabby",
			frontend: "Md Sakib Hossain",
		},
		serverStatus: "Active & Running Smoothly 🟢",
		timestamp: new Date().toISOString(),
	});
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
