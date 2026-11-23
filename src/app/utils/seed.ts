import { email } from "zod";
import { Role } from "../../generated/prisma/enums";
import config from "../config";
import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

export const seedSuperAdmin = async () => {
  try {
    const isSuperAdminExist = await prisma.user.findFirst({
      where: {
        role: Role.SUPER_ADMIN,
      },
    });

    if (isSuperAdminExist) {
      console.log("Super Admin Already Exists!");
      return;
    }

    const name = config.super_admin_name;
    const email = config.super_admin_email;
    const password = config.super_admin_password;

    if (!name || !email || !password) {
      throw new Error("Super Admin Name, Email, Password Missing in Env File!");
    }
    const hashedPassword = await bcrypt.hash(
      password,
      Number(config.bcrypt_salt_rounds),
    );
    const superAdmin = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: Role.SUPER_ADMIN,
        needPasswordChange: false,
        emailVerified: true,
      },
    });

    console.log("Super Admin Created Successfully: ", superAdmin);
  } catch (error) {
    console.log("Error Seeding Super Admin: ", error);
    await prisma.user.delete({
      where: {
        email: config.super_admin_email,
      },
    });
  }
};

export const seedTesterAdmin = async () => {
  try {
    const isTesterAdminExist = await prisma.user.findUnique({
      where: {
        email: config.tester_admin_email,
      },
    });

    if (isTesterAdminExist) {
      console.log("Tester Admin Already Exists!");
      return;
    }

    const name = config.tester_admin_name;
    const email = config.tester_admin_email;
    const password = config.tester_admin_password;

    if (!name || !email || !password) {
      throw new Error(
        "Tester Admin Name, Email, Password Missing In Env File!",
      );
    }

    const hashedPassword = await bcrypt.hash(
      password,
      Number(config.bcrypt_salt_rounds),
    );

    const testerAdmin = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: Role.ADMIN,
        needPasswordChange: false,
        emailVerified: true,
      },
    });

    console.log("Tester Admin Created Successfully: ", testerAdmin);
  } catch (error) {
    console.log("Error Seeding Tester Admin: ", error);

    await prisma.user.delete({
      where: {
        email: config.tester_admin_email,
      },
    });
  }
};

export const seedTesterCanteenOwner = async () => {
  try {
    const name = config.tester_canteenOwner_name;
    const email = config.tester_canteenOwner_email;
    const password = config.tester_canteenOwner_password;

    if (!name || !email || !password) {
      throw new Error(
        "Tester Canteen Owner Name, Email, Password Missing In Env File!",
      );
    }

    let ownerUser = await prisma.user.findUnique({
      where: { email },
      include: { canteenProfile: true },
    });

    if (!ownerUser) {
      const hashedPassword = await bcrypt.hash(
        password,
        Number(config.bcrypt_salt_rounds),
      );

      ownerUser = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: Role.CANTEEN_OWNER,
          needPasswordChange: false,
          emailVerified: true,
        },
        include: { canteenProfile: true },
      });
      console.log("Tester Canteen Owner User Created Successfully!");
    }

    // Ensure CanteenOwnerProfile is linked to an available Hall
    if (!ownerUser.canteenProfile) {
      const availableHall = await prisma.hall.findFirst({
        where: { canteenOwner: null, isActive: true },
      });

      if (availableHall) {
        await prisma.canteenOwnerProfile.create({
          data: {
            userId: ownerUser.id,
            hallId: availableHall.id,
            businessName: `${availableHall.shortName} Central Canteen`,
            contactPhone: "01700000000",
          },
        });
        console.log(
          `Tester Canteen Owner linked to Hall: ${availableHall.shortName}`,
        );
      } else {
        console.log(
          "Tester Canteen Owner exists, but no unassigned Hall found yet. Assign via Admin API later.",
        );
      }
    } else {
      console.log("Tester Canteen Owner & Profile Already Exists!");
    }
  } catch (error) {
    console.log("Error Seeding Tester Canteen Owner: ", error);
  }
};
