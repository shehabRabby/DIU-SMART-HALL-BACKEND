"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const config_1 = __importDefault(require("./app/config"));
const nodemailer_1 = require("./app/lib/nodemailer");
const prisma_1 = require("./app/lib/prisma");
const redis_1 = require("./app/lib/redis");
const seed_1 = require("./app/utils/seed");
const PORT = config_1.default.port;
const main = async () => {
    try {
        await prisma_1.prisma.$connect();
        console.log("Database connection established successfully.");
        await redis_1.redisClient.connect();
        console.log("Redis connection established successfully.");
        await nodemailer_1.transporter.verify();
        console.log("Nodemailer transporter verified successfully.");
        await (0, seed_1.seedSuperAdmin)();
        await (0, seed_1.seedTesterAdmin)();
        await (0, seed_1.seedTesterCanteenOwner)();
        app_1.default.listen(PORT, () => {
            console.log(`DIU Smart Hall Server is running smoothly on port ${PORT}`);
        });
    }
    catch (error) {
        console.error("Failed to start the server due to an error:", error);
        await prisma_1.prisma.$disconnect();
        process.exit(1);
    }
};
main();
