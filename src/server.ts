import app from "./app";
import config from "./app/config";
import { transporter } from "./app/lib/nodemailer";
import { prisma } from "./app/lib/prisma";
import { redisClient } from "./app/lib/redis";
import {
  seedSuperAdmin,
  seedTesterAdmin,
  seedTesterCanteenOwner,
} from "./app/utils/seed";

const PORT = config.port;

const main = async () => {
  try {
    await prisma.$connect();
    console.log("Database connection established successfully.");

    await redisClient.connect();
    console.log("Redis connection established successfully.");

    await transporter.verify();
    console.log("Nodemailer transporter verified successfully.");

    await seedSuperAdmin();
    await seedTesterAdmin();
    await seedTesterCanteenOwner();

    app.listen(PORT, () => {
      console.log(`DIU Smart Hall Server is running smoothly on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start the server due to an error:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

main();