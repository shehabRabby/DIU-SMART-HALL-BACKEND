"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const crypto_1 = __importDefault(require("crypto"));
const express_1 = __importDefault(require("express"));
const http_status_1 = __importDefault(require("http-status"));
const config_1 = __importDefault(require("./app/config"));
const redis_1 = require("./app/lib/redis");
const globalErrorHandler_1 = require("./app/middleware/globalErrorHandler");
const notFound_1 = require("./app/middleware/notFound");
const auth_route_1 = require("./app/modules/auth/auth.route");
const user_route_1 = require("./app/modules/auth/user/user.route");
const canteen_controller_1 = require("./app/modules/canteen/canteen.controller");
const canteen_route_1 = require("./app/modules/canteen/canteen.route");
const discipline_route_1 = require("./app/modules/discipline/discipline.route");
const gatePass_route_1 = require("./app/modules/gatePass/gatePass.route");
const hall_route_1 = require("./app/modules/hall/hall.route");
const notice_route_1 = require("./app/modules/notice/notice.route");
const seat_route_1 = require("./app/modules/seat/seat.route");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: config_1.default.frontend_url,
    credentials: true,
}));
// MUST come BEFORE express.json() so Stripe webhook gets the raw Buffer
app.post("/api/v1/canteen/payments/stripe/webhook", express_1.default.raw({ type: "application/json" }), canteen_controller_1.CanteenController.stripeWebhook);
app.use(express_1.default.urlencoded({ extended: true }));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// Ensure Redis is connected on Serverless cold starts (Vercel)
app.use(async (_req, _res, next) => {
    try {
        await (0, redis_1.connectRedis)();
        next();
    }
    catch (error) {
        next(error);
    }
});
app.use("/api/v1/auth", auth_route_1.AuthRoutes);
app.use("/api/v1/user", user_route_1.UserRoutes);
app.use("/api/v1/halls", hall_route_1.HallRoutes);
app.use("/api/v1/seats", seat_route_1.SeatRoutes);
app.use("/api/v1/discipline", discipline_route_1.DisciplineRoutes);
app.use("/api/v1/notices", notice_route_1.NoticeRoutes);
app.use("/api/v1/gate-passes", gatePass_route_1.GatePassRoutes);
app.use("/api/v1/canteen", canteen_route_1.CanteenRoutes);
app.post("/demo", async (req, res, next) => {
    try {
        const otp = crypto_1.default.randomInt(100000, 1000000);
        res.status(http_status_1.default.OK).json({
            success: true,
            message: "Welcome to DIU SMART HALL API Server!",
            data: { otp },
        });
    }
    catch (error) {
        console.log(error);
        next(error);
    }
});
app.get("/", async (req, res) => {
    res.status(http_status_1.default.OK).json({
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
app.use(globalErrorHandler_1.globalErrorHandler);
app.use(notFound_1.notFound);
exports.default = app;
