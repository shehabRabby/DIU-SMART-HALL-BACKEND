"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(process.cwd(), ".env") });
exports.default = {
    node_env: process.env.NODE_ENV,
    port: process.env.PORT,
    database_url: process.env.DATABASE_URL,
    bak_url: process.env.APP_URL || process.env.BACKEND_URL,
    backend_url: process.env.BACKEND_URL || "http://localhost:5000/api/v1",
    frontend_url: process.env.FRONTEND_URL || "http://localhost:3000",
    bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
    jwt_access_secret: process.env.JWT_ACCESS_SECRET,
    jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
    jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN,
    jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN,
    google_client_id: process.env.GOOGLE_CLIENT_ID,
    super_admin_name: process.env.SUPER_ADMIN_NAME,
    super_admin_email: process.env.SUPER_ADMIN_EMAIL,
    super_admin_password: process.env.SUPER_ADMIN_PASSWORD,
    tester_admin_name: process.env.TESTER_ADMIN_NAME,
    tester_admin_email: process.env.TESTER_ADMIN_EMAIL,
    tester_admin_password: process.env.TESTER_ADMIN_PASSWORD,
    tester_canteenOwner_name: process.env.TESTER_CANTEENOWNER_NAME,
    tester_canteenOwner_email: process.env.TESTER_CANTEENOWNER_EMAIL,
    tester_canteenOwner_password: process.env.TESTER_CANTEENOWNER_PASSWORD,
    redis_user: process.env.REDIS_USER,
    redis_password: process.env.REDIS_PASSWORD,
    redis_host: process.env.REDIS_HOST,
    redis_port: process.env.REDIS_PORT,
    smtp_password: process.env.SMTP_PASSWORD,
    smtp_user: process.env.SMTP_USER,
    email_sender: process.env.EMAIL_SENDER,
    cloudinary_cloude_name: process.env.CLOUDINARY_CLOUD_NAME,
    cloudinary_api_key: process.env.CLOUDINARY_API_KEY,
    cloudinary_api_secret: process.env.CLOUDINARY_API_SECRET,
    // Canteen QR & Payment Gateways
    canteen_qr_secret: process.env.CANTEEN_QR_SECRET || process.env.JWT_ACCESS_SECRET,
    stripe: {
        secret_key: process.env.STRIPE_SECRET_KEY || "",
        webhook_secret: process.env.STRIPE_WEBHOOK_SECRET || "",
    },
    bkash: {
        base_url: process.env.BKASH_BASE_URL ||
            "https://tokenized.sandbox.bka.sh/v1.2.0-beta",
        app_key: process.env.BKASH_APP_KEY || "",
        app_secret: process.env.BKASH_APP_SECRET || "",
        username: process.env.BKASH_USERNAME || "",
        password: process.env.BKASH_PASSWORD || "",
    },
    nagad: {
        base_url: process.env.NAGAD_BASE_URL || "",
        merchant_id: process.env.NAGAD_MERCHANT_ID || "",
        merchant_number: process.env.NAGAD_MERCHANT_NUMBER || "",
        public_key: process.env.NAGAD_PUBLIC_KEY || "",
        private_key: process.env.NAGAD_PRIVATE_KEY || "",
    },
    rocket: {
        base_url: process.env.ROCKET_BASE_URL || "",
        merchant_id: process.env.ROCKET_MERCHANT_ID || "",
        secret_key: process.env.ROCKET_SECRET_KEY || "",
    },
    one_card: {
        base_url: process.env.ONECARD_BASE_URL || "",
        merchant_id: process.env.ONECARD_MERCHANT_ID || "",
        api_key: process.env.ONECARD_API_KEY || "",
    },
};
