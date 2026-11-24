"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedTesterCanteenOwner = exports.seedTesterAdmin = exports.seedSuperAdmin = void 0;
const enums_1 = require("../../generated/prisma/enums");
const config_1 = __importDefault(require("../config"));
const prisma_1 = require("../lib/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const seedSuperAdmin = async () => {
    try {
        const isSuperAdminExist = await prisma_1.prisma.user.findFirst({
            where: {
                role: enums_1.Role.SUPER_ADMIN,
            },
        });
        if (isSuperAdminExist) {
            console.log("Super Admin Already Exists!");
            return;
        }
        const name = config_1.default.super_admin_name;
        const email = config_1.default.super_admin_email;
        const password = config_1.default.super_admin_password;
        if (!name || !email || !password) {
            throw new Error("Super Admin Name, Email, Password Missing in Env File!");
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, Number(config_1.default.bcrypt_salt_rounds));
        const superAdmin = await prisma_1.prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: enums_1.Role.SUPER_ADMIN,
                needPasswordChange: false,
                emailVerified: true,
            },
        });
        console.log("Super Admin Created Successfully: ", superAdmin);
    }
    catch (error) {
        console.log("Error Seeding Super Admin: ", error);
        await prisma_1.prisma.user.delete({
            where: {
                email: config_1.default.super_admin_email,
            },
        });
    }
};
exports.seedSuperAdmin = seedSuperAdmin;
const seedTesterAdmin = async () => {
    try {
        const isTesterAdminExist = await prisma_1.prisma.user.findUnique({
            where: {
                email: config_1.default.tester_admin_email,
            },
        });
        if (isTesterAdminExist) {
            console.log("Tester Admin Already Exists!");
            return;
        }
        const name = config_1.default.tester_admin_name;
        const email = config_1.default.tester_admin_email;
        const password = config_1.default.tester_admin_password;
        if (!name || !email || !password) {
            throw new Error("Tester Admin Name, Email, Password Missing In Env File!");
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, Number(config_1.default.bcrypt_salt_rounds));
        const testerAdmin = await prisma_1.prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: enums_1.Role.ADMIN,
                needPasswordChange: false,
                emailVerified: true,
            },
        });
        console.log("Tester Admin Created Successfully: ", testerAdmin);
    }
    catch (error) {
        console.log("Error Seeding Tester Admin: ", error);
        await prisma_1.prisma.user.delete({
            where: {
                email: config_1.default.tester_admin_email,
            },
        });
    }
};
exports.seedTesterAdmin = seedTesterAdmin;
const seedTesterCanteenOwner = async () => {
    try {
        const name = config_1.default.tester_canteenOwner_name;
        const email = config_1.default.tester_canteenOwner_email;
        const password = config_1.default.tester_canteenOwner_password;
        if (!name || !email || !password) {
            throw new Error("Tester Canteen Owner Name, Email, Password Missing In Env File!");
        }
        let ownerUser = await prisma_1.prisma.user.findUnique({
            where: { email },
            include: { canteenProfile: true },
        });
        if (!ownerUser) {
            const hashedPassword = await bcryptjs_1.default.hash(password, Number(config_1.default.bcrypt_salt_rounds));
            ownerUser = await prisma_1.prisma.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    role: enums_1.Role.CANTEEN_OWNER,
                    needPasswordChange: false,
                    emailVerified: true,
                },
                include: { canteenProfile: true },
            });
            console.log("Tester Canteen Owner User Created Successfully!");
        }
        // Ensure CanteenOwnerProfile is linked to an available Hall
        if (!ownerUser.canteenProfile) {
            const availableHall = await prisma_1.prisma.hall.findFirst({
                where: { canteenOwner: null, isActive: true },
            });
            if (availableHall) {
                await prisma_1.prisma.canteenOwnerProfile.create({
                    data: {
                        userId: ownerUser.id,
                        hallId: availableHall.id,
                        businessName: `${availableHall.shortName} Central Canteen`,
                        contactPhone: "01700000000",
                    },
                });
                console.log(`Tester Canteen Owner linked to Hall: ${availableHall.shortName}`);
            }
            else {
                console.log("Tester Canteen Owner exists, but no unassigned Hall found yet. Assign via Admin API later.");
            }
        }
        else {
            console.log("Tester Canteen Owner & Profile Already Exists!");
        }
    }
    catch (error) {
        console.log("Error Seeding Tester Canteen Owner: ", error);
    }
};
exports.seedTesterCanteenOwner = seedTesterCanteenOwner;
