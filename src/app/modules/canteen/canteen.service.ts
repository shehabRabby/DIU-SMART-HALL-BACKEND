import bcrypt from "bcryptjs";
import { Prisma } from "../../../generated/prisma/client";
import {
  ComplaintStatus,
  FoodOrderStatus,
  FoodPaymentMethod,
  FoodPaymentStatus,
  MealSlot,
  MenuApprovalStatus,
  Role,
  TokenStatus,
  UserStatus,
} from "../../../generated/prisma/enums";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import {
  ICreateCanteenOwnerPayload,
  ICreateFoodComplaintPayload,
  ICreateFoodOrderPayload,
  ICreateMealReviewPayload,
  ICreateMenuItemPayload,
  IRedeemFoodTokenPayload,
  IResolveFoodComplaintPayload,
  IReviewMenuPricePayload,
  IUpdateCanteenOwnerStatusPayload,
  IUpdateMenuItemPayload,
  IUpdateOrderStatusPayload,
  IUpsertMasterPricePayload,
} from "./canteen.interface";
import {
  assertBeforeCutoffDeadline,
  assertWithinServingWindow,
  generateOrderSecurityCredentials,
  getSlotScheduleWindows,
  normalizeMealDate,
  verifyQrTokenSignature,
} from "./canteen.utils";

/**
 * Helper 1: Verify Student is an active, non-expelled resident of a Hall
 */
const verifyResidentStudent = async (userId: string) => {
  const student = await prisma.student.findUnique({
    where: { userId },
    include: {
      user: { select: { name: true, email: true, imageUrl: true, status: true } },
      hall: { select: { id: true, name: true, shortName: true } },
      room: { select: { id: true, roomNumber: true } },
      canteenWallet: true,
    },
  });

  if (!student || student.isDeleted || student.user.status !== UserStatus.ACTIVE) {
    throw new Error("Active student profile not found.");
  }
  if (student.isExpelled) {
    throw new Error("Expelled students are barred from hall canteen services.");
  }
  if (!student.isResident || !student.hallId) {
    throw new Error(
      "Only allocated hall residents can access hall canteen pre-orders.",
    );
  }

  return student;
};

/**
 * Helper 2: Verify Canteen Owner profile and ensure Hall isolation
 */
const verifyCanteenOwner = async (userId: string) => {
  const profile = await prisma.canteenOwnerProfile.findUnique({
    where: { userId },
    include: {
      hall: { select: { id: true, name: true, shortName: true } },
      user: { select: { status: true } },
    },
  });

  if (!profile || !profile.isActive || profile.user.status !== UserStatus.ACTIVE) {
    throw new Error(
      "Active Canteen Owner profile not found or suspended. Please contact Hall Admin.",
    );
  }

  return profile;
};

// ============================================================================
// 1. ADMIN GOVERNANCE (Canteen Owner Creation, Suspension & Master Price Control)
// ============================================================================

const createCanteenOwner = async (payload: ICreateCanteenOwnerPayload) => {
  const hall = await prisma.hall.findUnique({
    where: { id: payload.hallId },
    include: { canteenOwner: true },
  });
  if (!hall) {
    throw new Error("Target Hall not found.");
  }
  if (hall.canteenOwner) {
    throw new Error(
      `Hall ${hall.shortName} already has an assigned Canteen Owner.`,
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
    include: { canteenProfile: true },
  });

  if (existingUser) {
    if (existingUser.role !== Role.CANTEEN_OWNER) {
      throw new Error(
        "A user with this email already exists with a different role.",
      );
    }
    if (existingUser.canteenProfile) {
      throw new Error(
        "This Canteen Owner is already assigned to another hall.",
      );
    }

    return prisma.canteenOwnerProfile.create({
      data: {
        userId: existingUser.id,
        hallId: payload.hallId,
        businessName: payload.businessName,
        contactPhone: payload.contactPhone,
      },
      include: {
        hall: { select: { id: true, name: true, shortName: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }

  const saltRounds = Number(config.bcrypt_salt_rounds) || 12;
  const hashedPassword = await bcrypt.hash(payload.password, saltRounds);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        password: hashedPassword,
        role: Role.CANTEEN_OWNER,
        emailVerified: true,
      },
    });

    return tx.canteenOwnerProfile.create({
      data: {
        userId: user.id,
        hallId: payload.hallId,
        businessName: payload.businessName,
        contactPhone: payload.contactPhone,
      },
      include: {
        hall: { select: { id: true, name: true, shortName: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  });
};

const updateCanteenOwnerStatus = async (
  canteenOwnerId: string,
  payload: IUpdateCanteenOwnerStatusPayload,
) => {
  const owner = await prisma.canteenOwnerProfile.findUnique({
    where: { id: canteenOwnerId },
    include: {
      hall: { select: { id: true, name: true, shortName: true } },
      user: { select: { id: true, name: true, email: true, status: true } },
    },
  });

  if (!owner) {
    throw new Error("Canteen Owner profile not found.");
  }

  // If removeAccount is requested, ensure no active/unconsumed future orders exist
  if (payload.removeAccount) {
    const activeOrdersCount = await prisma.foodOrder.count({
      where: {
        canteenId: owner.id,
        orderStatus: {
          in: [
            FoodOrderStatus.CONFIRMED,
            FoodOrderStatus.PREPARING,
            FoodOrderStatus.READY_FOR_PICKUP,
          ],
        },
      },
    });

    if (activeOrdersCount > 0) {
      throw new Error(
        `Cannot remove Canteen Owner while ${activeOrdersCount} active meal order(s) are pending fulfillment. Suspend the account first.`,
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.canteenOwnerProfile.delete({
        where: { id: owner.id },
      });
      await tx.user.update({
        where: { id: owner.userId },
        data: { status: UserStatus.DELETED },
      });
    });

    return {
      removed: true,
      canteenOwnerId: owner.id,
      hall: owner.hall,
      message: "Canteen Owner removed from hall and account deactivated.",
    };
  }

  // Otherwise suspend or re-activate
  return prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: owner.userId },
      data: {
        status: payload.isActive ? UserStatus.ACTIVE : UserStatus.BLOCKED,
      },
    });

    return tx.canteenOwnerProfile.update({
      where: { id: owner.id },
      data: {
        isActive: payload.isActive,
      },
      include: {
        hall: { select: { id: true, name: true, shortName: true } },
        user: { select: { id: true, name: true, email: true, status: true } },
      },
    });
  });
};

const upsertMasterPriceItem = async (
  adminUserId: string,
  payload: IUpsertMasterPricePayload,
) => {
  return prisma.hallMasterPriceItem.upsert({
    where: {
      uq_hall_master_price_item: {
        hallId: payload.hallId,
        itemName: payload.itemName.trim(),
        portion: payload.portion,
      },
    },
    update: {
      category: payload.category,
      maxAllowedTk: payload.maxAllowedTk,
      isActive: payload.isActive ?? true,
    },
    create: {
      hallId: payload.hallId,
      itemName: payload.itemName.trim(),
      category: payload.category,
      portion: payload.portion,
      maxAllowedTk: payload.maxAllowedTk,
      isActive: payload.isActive ?? true,
      createdById: adminUserId,
    },
  });
};

const getHallMasterPrices = async (hallId: string) => {
  return prisma.hallMasterPriceItem.findMany({
    where: { hallId, isActive: true },
    orderBy: [{ category: "asc" }, { itemName: "asc" }],
  });
};

const reviewMenuItemPrice = async (
  adminUserId: string,
  menuItemId: string,
  payload: IReviewMenuPricePayload,
) => {
  const item = await prisma.canteenMenuItem.findUnique({
    where: { id: menuItemId },
  });
  if (!item) {
    throw new Error("Menu item not found.");
  }

  return prisma.canteenMenuItem.update({
    where: { id: menuItemId },
    data: {
      approvalStatus: payload.approvalStatus,
      adminNote: payload.adminNote ?? null,
      approvedById: adminUserId,
    },
  });
};

// ============================================================================
// 2. CANTEEN OWNER: MENU MANAGEMENT, KITCHEN DASHBOARD & SALES/DUE LEDGER
// ============================================================================

const createMenuItem = async (
  userId: string,
  payload: ICreateMenuItemPayload,
) => {
  const canteen = await verifyCanteenOwner(userId);

  let approvalStatus: MenuApprovalStatus = MenuApprovalStatus.APPROVED;
  let linkedMasterPriceId = payload.masterPriceId ?? null;

  const masterCap = payload.masterPriceId
    ? await prisma.hallMasterPriceItem.findFirst({
        where: {
          id: payload.masterPriceId,
          hallId: canteen.hallId,
          isActive: true,
        },
      })
    : await prisma.hallMasterPriceItem.findFirst({
        where: {
          hallId: canteen.hallId,
          itemName: { equals: payload.name.trim(), mode: "insensitive" },
          portion: payload.portion,
          isActive: true,
        },
      });

  if (masterCap) {
    linkedMasterPriceId = masterCap.id;
    if (payload.price > masterCap.maxAllowedTk) {
      approvalStatus = MenuApprovalStatus.PENDING_PRICE_APPROVAL;
    }
  } else if (payload.isSpecial || payload.isCombo) {
    approvalStatus = MenuApprovalStatus.PENDING_PRICE_APPROVAL;
  }

  return prisma.canteenMenuItem.create({
    data: {
      name: payload.name.trim(),
      description: payload.description,
      imageUrl: payload.imageUrl,
      category: payload.category,
      portion: payload.portion,
      price: payload.price,
      isRegular: payload.isRegular ?? true,
      isSpecial: payload.isSpecial ?? false,
      availableDate: payload.availableDate
        ? normalizeMealDate(payload.availableDate)
        : null,
      availableSlots: payload.availableSlots,
      isCombo: payload.isCombo ?? false,
      comboDetails: (payload.comboDetails ??
        []) as unknown as Prisma.InputJsonValue,
      maxQuantity: payload.maxQuantity ?? null,
      isAvailable: payload.isAvailable ?? true,
      approvalStatus,
      hallId: canteen.hallId,
      canteenId: canteen.id,
      masterPriceId: linkedMasterPriceId,
    },
  });
};

const updateMenuItem = async (
  userId: string,
  menuItemId: string,
  payload: IUpdateMenuItemPayload,
) => {
  const canteen = await verifyCanteenOwner(userId);
  const existing = await prisma.canteenMenuItem.findFirst({
    where: { id: menuItemId, canteenId: canteen.id },
    include: { masterPrice: true },
  });

  if (!existing) {
    throw new Error("Menu item not found in your canteen.");
  }

  let nextApprovalStatus = existing.approvalStatus;
  if (payload.price !== undefined && payload.price > existing.price) {
    if (
      !existing.masterPrice ||
      payload.price > existing.masterPrice.maxAllowedTk
    ) {
      nextApprovalStatus = MenuApprovalStatus.PENDING_PRICE_APPROVAL;
    }
  }

  return prisma.canteenMenuItem.update({
    where: { id: menuItemId },
    data: {
      ...payload,
      availableDate:
        payload.availableDate !== undefined
          ? payload.availableDate
            ? normalizeMealDate(payload.availableDate)
            : null
          : existing.availableDate,
      approvalStatus: nextApprovalStatus,
    },
  });
};

const getCanteenOwnMenu = async (userId: string) => {
  const canteen = await verifyCanteenOwner(userId);
  return prisma.canteenMenuItem.findMany({
    where: { canteenId: canteen.id },
    include: {
      masterPrice: { select: { itemName: true, maxAllowedTk: true } },
      _count: { select: { reviews: true } },
    },
    orderBy: [{ createdAt: "desc" }],
  });
};

const getKitchenPrepSummary = async (
  userId: string,
  mealDateStr: string,
  mealSlot: MealSlot,
) => {
  const canteen = await verifyCanteenOwner(userId);
  const mealDate = normalizeMealDate(mealDateStr);
  const schedule = getSlotScheduleWindows(mealDate, mealSlot);

  const validOrders = await prisma.foodOrder.findMany({
    where: {
      canteenId: canteen.id,
      mealDate,
      mealSlot,
      orderStatus: {
        in: [
          FoodOrderStatus.CONFIRMED,
          FoodOrderStatus.PREPARING,
          FoodOrderStatus.READY_FOR_PICKUP,
          FoodOrderStatus.COMPLETED,
        ],
      },
    },
    include: {
      items: {
        include: {
          menuItem: {
            select: { isCombo: true, comboDetails: true },
          },
        },
      },
    },
  });

  const itemCounts: Record<
    string,
    { name: string; portion: string; totalQty: number }
  > = {};

  let totalOrders = 0;
  let consumedCount = 0;
  let pendingPickupCount = 0;
  let totalRevenuePaid = 0;
  let totalCounterDue = 0;

  for (const order of validOrders) {
    totalOrders += 1;
    if (order.tokenStatus === TokenStatus.CONSUMED) {
      consumedCount += 1;
    } else if (order.tokenStatus === TokenStatus.ISSUED) {
      pendingPickupCount += 1;
    }

    if (order.paymentStatus === FoodPaymentStatus.PAID) {
      totalRevenuePaid += order.totalAmount;
    } else {
      totalCounterDue += order.totalAmount;
    }

    for (const item of order.items) {
      const key = `${item.itemName}_${item.portion}`;
      if (!itemCounts[key]) {
        itemCounts[key] = {
          name: item.itemName,
          portion: item.portion,
          totalQty: 0,
        };
      }
      itemCounts[key].totalQty += item.quantity;

      if (item.menuItem.isCombo && Array.isArray(item.menuItem.comboDetails)) {
        const subItems = item.menuItem.comboDetails as {
          itemName: string;
          qty: number;
        }[];
        for (const sub of subItems) {
          const subKey = `COMBO_COMPONENT_${sub.itemName}`;
          if (!itemCounts[subKey]) {
            itemCounts[subKey] = {
              name: `[Combo Part] ${sub.itemName}`,
              portion: "UNIT",
              totalQty: 0,
            };
          }
          itemCounts[subKey].totalQty += sub.qty * item.quantity;
        }
      }
    }
  }

  return {
    hall: canteen.hall,
    mealDate,
    mealSlot,
    servingWindow: schedule.label,
    cutoffAt: schedule.cutoffAt,
    stats: {
      totalOrders,
      consumedCount,
      pendingPickupCount,
      totalRevenuePaid,
      totalCounterDue,
    },
    kitchenChecklist: Object.values(itemCounts),
  };
};

// Direct Sales & Counter Due Ledger (SRS Section 1)
const getVendorSalesAndDueLedger = async (
  userId: string,
  fromDateStr?: string,
  toDateStr?: string,
) => {
  const canteen = await verifyCanteenOwner(userId);

  const dateFilter: Prisma.DateTimeFilter = {};
  if (fromDateStr) {
    dateFilter.gte = normalizeMealDate(fromDateStr);
  }
  if (toDateStr) {
    const end = normalizeMealDate(toDateStr);
    end.setUTCHours(23, 59, 59, 999);
    dateFilter.lte = end;
  }

  const orders = await prisma.foodOrder.findMany({
    where: {
      canteenId: canteen.id,
      ...(fromDateStr || toDateStr ? { mealDate: dateFilter } : {}),
      orderStatus: {
        notIn: [FoodOrderStatus.CANCELLED, FoodOrderStatus.PENDING_PAYMENT],
      },
    },
    include: {
      student: {
        select: {
          name: true,
          studentUniId: true,
          room: { select: { roomNumber: true } },
        },
      },
      transactions: {
        where: { status: FoodPaymentStatus.PAID },
        select: { tranId: true, gateway: true, gatewayRefId: true, verifiedAt: true },
      },
    },
    orderBy: [{ mealDate: "desc" }, { createdAt: "desc" }],
  });

  const breakdownByMethod: Record<string, { count: number; totalTk: number }> = {};
  let totalSettledSalesTk = 0;
  let totalPendingCounterDueTk = 0;
  let totalNoShowUnpaidTk = 0;

  const unpaidDueList: Array<{
    orderId: string;
    orderCode: string;
    mealDate: Date;
    mealSlot: MealSlot;
    orderStatus: FoodOrderStatus;
    amountTk: number;
    studentName: string;
    studentUniId: string;
    roomNumber: string;
  }> = [];

  for (const order of orders) {
    if (!breakdownByMethod[order.paymentMethod]) {
      breakdownByMethod[order.paymentMethod] = { count: 0, totalTk: 0 };
    }
    breakdownByMethod[order.paymentMethod].count += 1;
    breakdownByMethod[order.paymentMethod].totalTk = Number(
      (breakdownByMethod[order.paymentMethod].totalTk + order.totalAmount).toFixed(2),
    );

    if (order.paymentStatus === FoodPaymentStatus.PAID) {
      totalSettledSalesTk = Number(
        (totalSettledSalesTk + order.totalAmount).toFixed(2),
      );
    } else if (order.paymentStatus === FoodPaymentStatus.UNPAID) {
      if (order.orderStatus === FoodOrderStatus.NO_SHOW) {
        totalNoShowUnpaidTk = Number(
          (totalNoShowUnpaidTk + order.totalAmount).toFixed(2),
        );
      } else {
        totalPendingCounterDueTk = Number(
          (totalPendingCounterDueTk + order.totalAmount).toFixed(2),
        );
      }

      unpaidDueList.push({
        orderId: order.id,
        orderCode: order.orderCode,
        mealDate: order.mealDate,
        mealSlot: order.mealSlot,
        orderStatus: order.orderStatus,
        amountTk: order.totalAmount,
        studentName: order.student.name,
        studentUniId: order.student.studentUniId ?? "N/A",
        roomNumber: order.student.room?.roomNumber ?? "N/A",
      });
    }
  }

  return {
    canteen: {
      id: canteen.id,
      businessName: canteen.businessName,
      hall: canteen.hall,
      warningCount: canteen.warningCount,
      totalFines: canteen.totalFines,
    },
    financialSummary: {
      totalValidOrders: orders.length,
      totalSettledSalesTk,
      totalPendingCounterDueTk,
      totalNoShowUnpaidTk,
      breakdownByMethod,
    },
    unpaidDueList,
    recentLedgerEntries: orders.slice(0, 50),
  };
};

// ============================================================================
// 3. STUDENT: MENU BROWSING, ZERO-TRUST ORDERING & CANCELLATION
// ============================================================================

const getStudentLiveMenu = async (
  userId: string,
  mealDateStr?: string,
  mealSlot?: MealSlot,
) => {
  const student = await verifyResidentStudent(userId);
  const targetDate = mealDateStr ? normalizeMealDate(mealDateStr) : undefined;

  return prisma.canteenMenuItem.findMany({
    where: {
      hallId: student.hallId!,
      isAvailable: true,
      approvalStatus: MenuApprovalStatus.APPROVED,
      ...(mealSlot ? { availableSlots: { has: mealSlot } } : {}),
      OR: [
        { isRegular: true },
        ...(targetDate ? [{ isSpecial: true, availableDate: targetDate }] : []),
      ],
    },
    include: {
      reviews: {
        select: { rating: true },
      },
    },
    orderBy: [{ isCombo: "desc" }, { category: "asc" }, { name: "asc" }],
  });
};

const getStudentMyOrders = async (userId: string) => {
  const student = await verifyResidentStudent(userId);
  return prisma.foodOrder.findMany({
    where: { studentId: student.id },
    include: {
      items: true,
      hall: { select: { name: true, shortName: true } },
      canteen: { select: { businessName: true, contactPhone: true } },
    },
    orderBy: [{ createdAt: "desc" }],
  });
};

const createFoodOrder = async (
  userId: string,
  payload: ICreateFoodOrderPayload,
) => {
  const student = await verifyResidentStudent(userId);
  const mealDate = normalizeMealDate(payload.mealDate);

  // 1. Enforce strict 6-Hour Cut-off Deadline
  const schedule = assertBeforeCutoffDeadline(mealDate, payload.mealSlot);

  // 2. Verify Hall has an active Canteen
  const canteen = await prisma.canteenOwnerProfile.findUnique({
    where: { hallId: student.hallId! },
  });
  if (!canteen || !canteen.isActive) {
    throw new Error("No active canteen is currently operating in your hall.");
  }

  // 3. Counter Cash Due Guardrails (No-Show & Unpaid Lock)
  if (payload.paymentMethod === FoodPaymentMethod.COUNTER_CASH) {
    const wallet = student.canteenWallet;
    if (wallet?.dueBlockedUntil && new Date() < wallet.dueBlockedUntil) {
      throw new Error(
        `Your Pay-at-Counter privilege is temporarily suspended until ${wallet.dueBlockedUntil.toDateString()} due to repeated no-shows.`,
      );
    }

    const unpaidOrder = await prisma.foodOrder.findFirst({
      where: {
        studentId: student.id,
        paymentStatus: FoodPaymentStatus.UNPAID,
        orderStatus: {
          notIn: [FoodOrderStatus.CANCELLED, FoodOrderStatus.PENDING_PAYMENT],
        },
      },
    });
    if (unpaidOrder) {
      throw new Error(
        `Please clear your previous unpaid order (${unpaidOrder.orderCode}) before placing a new Counter Cash order.`,
      );
    }
  }

  // 4. Deduplicate repeated menuItemIds in payload so stock & max-10 guard cannot be bypassed
  const mergedItemMap = new Map<string, number>();
  for (const item of payload.items) {
    const nextQty = (mergedItemMap.get(item.menuItemId) ?? 0) + item.quantity;
    if (nextQty > 10) {
      throw new Error("Maximum 10 portions per item allowed in a single order.");
    }
    mergedItemMap.set(item.menuItemId, nextQty);
  }
  const normalizedItems = Array.from(mergedItemMap.entries()).map(
    ([menuItemId, quantity]) => ({ menuItemId, quantity }),
  );

  // 5. Zero-Trust Server-Side Price & Availability Resolution
  const requestedIds = normalizedItems.map((i) => i.menuItemId);
  const dbMenuItems = await prisma.canteenMenuItem.findMany({
    where: {
      id: { in: requestedIds },
      hallId: student.hallId!,
      isAvailable: true,
      approvalStatus: MenuApprovalStatus.APPROVED,
    },
  });

  if (dbMenuItems.length !== requestedIds.length) {
    throw new Error(
      "One or more selected menu items are unavailable, unapproved, or belong to another hall.",
    );
  }

  const menuMap = new Map(dbMenuItems.map((m) => [m.id, m]));
  let totalAmount = 0;

  const preparedOrderItems = normalizedItems.map((reqItem) => {
    const menu = menuMap.get(reqItem.menuItemId)!;

    if (!menu.availableSlots.includes(payload.mealSlot)) {
      throw new Error(`${menu.name} is not available for ${payload.mealSlot}.`);
    }

    if (
      menu.isSpecial &&
      menu.availableDate &&
      menu.availableDate.getTime() !== mealDate.getTime()
    ) {
      throw new Error(
        `${menu.name} is a special item only available on ${menu.availableDate.toISOString().split("T")[0]}.`,
      );
    }

    if (
      menu.maxQuantity !== null &&
      menu.soldCount + reqItem.quantity > menu.maxQuantity
    ) {
      throw new Error(
        `Insufficient stock for ${menu.name}. Only ${Math.max(0, menu.maxQuantity - menu.soldCount)} left.`,
      );
    }

    const subtotal = Number((menu.price * reqItem.quantity).toFixed(2));
    totalAmount = Number((totalAmount + subtotal).toFixed(2));

    return {
      menuItemId: menu.id,
      itemName: menu.name,
      portion: menu.portion,
      quantity: reqItem.quantity,
      unitPrice: menu.price,
      subtotal,
      hasStockCap: menu.maxQuantity !== null,
    };
  });

  // 6. Generate Tamper-Proof One-Time QR & 4-Digit PIN
  const security = generateOrderSecurityCredentials(
    student.id,
    student.hallId!,
    mealDate,
    payload.mealSlot,
  );

  // 7. Execute Atomic Transaction (Stock Lock + 1Card Deduction + Order Creation)
  return prisma.$transaction(async (tx) => {
    for (const item of preparedOrderItems) {
      if (item.hasStockCap) {
        const menu = menuMap.get(item.menuItemId)!;
        const updated = await tx.canteenMenuItem.updateMany({
          where: {
            id: item.menuItemId,
            soldCount: { lte: menu.maxQuantity! - item.quantity },
          },
          data: {
            soldCount: { increment: item.quantity },
          },
        });
        if (updated.count === 0) {
          throw new Error(`Sold out! ${item.itemName} just ran out of stock.`);
        }
      } else {
        await tx.canteenMenuItem.update({
          where: { id: item.menuItemId },
          data: { soldCount: { increment: item.quantity } },
        });
      }
    }

    let paymentStatus: FoodPaymentStatus = FoodPaymentStatus.UNPAID;
    let orderStatus: FoodOrderStatus = FoodOrderStatus.PENDING_PAYMENT;
    let paidAt: Date | null = null;

    if (payload.paymentMethod === FoodPaymentMethod.ONECARD) {
      const wallet = await tx.canteenWallet.findUnique({
        where: { studentId: student.id },
      });
      if (!wallet || wallet.balance < totalAmount) {
        throw new Error(
          "Insufficient balance in your DIU 1Card Canteen Account.",
        );
      }

      await tx.canteenWallet.update({
        where: { studentId: student.id },
        data: { balance: { decrement: totalAmount } },
      });

      paymentStatus = FoodPaymentStatus.PAID;
      orderStatus = FoodOrderStatus.CONFIRMED;
      paidAt = new Date();
    } else if (payload.paymentMethod === FoodPaymentMethod.COUNTER_CASH) {
      paymentStatus = FoodPaymentStatus.UNPAID;
      orderStatus = FoodOrderStatus.CONFIRMED;
    }

    const order = await tx.foodOrder.create({
      data: {
        orderCode: security.orderCode,
        qrToken: security.qrToken,
        pickupPin: security.pickupPin,
        mealDate,
        mealSlot: payload.mealSlot,
        totalAmount,
        paymentMethod: payload.paymentMethod,
        paymentStatus,
        orderStatus,
        tokenStatus: TokenStatus.ISSUED,
        paidAt,
        studentId: student.id,
        hallId: student.hallId!,
        canteenId: canteen.id,
        items: {
          create: preparedOrderItems.map(
            ({ hasStockCap: _ignored, ...rest }) => rest,
          ),
        },
      },
      include: {
        items: true,
        hall: { select: { name: true, shortName: true } },
        canteen: { select: { businessName: true, contactPhone: true } },
      },
    });

    return {
      order,
      servingWindow: schedule.label,
      cutoffAt: schedule.cutoffAt,
    };
  });
};

const cancelFoodOrder = async (
  userId: string,
  orderId: string,
  reason?: string,
) => {
  const student = await verifyResidentStudent(userId);
  const order = await prisma.foodOrder.findFirst({
    where: { id: orderId, studentId: student.id },
    include: { items: true },
  });

  if (!order) {
    throw new Error("Order not found.");
  }
  if (
    order.orderStatus === FoodOrderStatus.CANCELLED ||
    order.tokenStatus === TokenStatus.CONSUMED
  ) {
    throw new Error("This order cannot be cancelled.");
  }

  assertBeforeCutoffDeadline(order.mealDate, order.mealSlot);

  return prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      await tx.canteenMenuItem.update({
        where: { id: item.menuItemId },
        data: { soldCount: { decrement: item.quantity } },
      });
    }

    let refundedTo1Card = false;
    if (order.paymentStatus === FoodPaymentStatus.PAID) {
      await tx.canteenWallet.upsert({
        where: { studentId: student.id },
        update: { balance: { increment: order.totalAmount } },
        create: { studentId: student.id, balance: order.totalAmount },
      });
      refundedTo1Card = true;
    }

    const updatedOrder = await tx.foodOrder.update({
      where: { id: order.id },
      data: {
        orderStatus: FoodOrderStatus.CANCELLED,
        tokenStatus: TokenStatus.CANCELLED,
        paymentStatus: refundedTo1Card
          ? FoodPaymentStatus.REFUNDED
          : order.paymentStatus,
        cancelledAt: new Date(),
        cancelReason: reason ?? "Cancelled by student before cut-off deadline",
      },
    });

    return {
      order: updatedOrder,
      refundedTo1Card,
      refundedAmount: refundedTo1Card ? order.totalAmount : 0,
    };
  });
};

const getDigitalMealSlip = async (userId: string, orderId: string) => {
  const student = await verifyResidentStudent(userId);

  const order = await prisma.foodOrder.findFirst({
    where: { id: orderId, studentId: student.id },
    include: {
      items: true,
      hall: { select: { name: true, shortName: true } },
      canteen: { select: { businessName: true, contactPhone: true } },
      transactions: {
        where: { status: FoodPaymentStatus.PAID },
        select: {
          tranId: true,
          gateway: true,
          gatewayRefId: true,
          verifiedAt: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error("Digital meal slip not found.");
  }

  if (
    order.paymentMethod !== FoodPaymentMethod.COUNTER_CASH &&
    order.paymentStatus !== FoodPaymentStatus.PAID
  ) {
    throw new Error(
      "Digital slip is locked until payment is verified. Please complete payment first.",
    );
  }

  const schedule = getSlotScheduleWindows(order.mealDate, order.mealSlot);

  return {
    slipHeader: "DIU SMARTHALL — OFFICIAL VERIFIED MEAL SLIP",
    orderCode: order.orderCode,
    qrToken: order.qrToken,
    pickupPin: order.pickupPin,
    tokenStatus: order.tokenStatus,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    studentIdentity: {
      name: student.name,
      studentUniId: student.studentUniId,
      photoUrl: student.user.imageUrl,
      hallName: order.hall.name,
      roomNumber: student.room?.roomNumber ?? "N/A",
    },
    timestamps: {
      mealDate: order.mealDate,
      mealSlot: order.mealSlot,
      servingWindow: schedule.label,
      orderPlacedAt: order.createdAt,
      paymentVerifiedAt: order.paidAt,
      consumedAt: order.consumedAt,
    },
    items: order.items,
    totalAmount: order.totalAmount,
    paymentProof: order.transactions[0] ?? null,
  };
};

// ============================================================================
// 4. COUNTER REDEMPTION: ONE-TIME QR / PIN VERIFICATION & DOUBLE-SCAN LOCK
// ============================================================================

const redeemFoodToken = async (
  canteenUserId: string,
  payload: IRedeemFoodTokenPayload,
) => {
  const canteen = await verifyCanteenOwner(canteenUserId);

  const order = await prisma.foodOrder.findFirst({
    where: payload.qrToken
      ? { qrToken: payload.qrToken }
      : { orderCode: payload.orderCode, pickupPin: payload.pickupPin },
    include: {
      items: true,
      student: {
        include: {
          user: { select: { imageUrl: true } },
          room: { select: { roomNumber: true } },
        },
      },
    },
  });

  if (!order) {
    throw new Error("INVALID SLIP: No matching meal order found.");
  }

  // 1. Hall Isolation Guard
  if (order.hallId !== canteen.hallId) {
    throw new Error(
      "HALL MISMATCH: This meal slip belongs to a different hall canteen!",
    );
  }

  // 2. Cryptographic Signature Verification (if QR scanned)
  if (payload.qrToken) {
    const isValidSig = verifyQrTokenSignature(
      payload.qrToken,
      order.studentId,
      order.hallId,
      order.mealDate,
      order.mealSlot,
    );
    if (!isValidSig) {
      throw new Error(
        "TAMPERED SLIP DETECTED: Cryptographic QR signature invalid!",
      );
    }
  }

  // 3. Single-Use Replay Guard
  if (order.tokenStatus === TokenStatus.CONSUMED) {
    throw new Error(
      `ALREADY USED! This meal slip was already redeemed at ${order.consumedAt?.toISOString()}.`,
    );
  }
  if (
    order.tokenStatus !== TokenStatus.ISSUED ||
    order.orderStatus === FoodOrderStatus.CANCELLED
  ) {
    throw new Error(
      `SLIP INACTIVE: Current token status is ${order.tokenStatus}.`,
    );
  }

  // 4. Active Meal Slot & Date Serving Window Check
  assertWithinServingWindow(order.mealDate, order.mealSlot);

  // 5. Unpaid Counter Cash Check
  if (
    order.paymentStatus === FoodPaymentStatus.UNPAID &&
    !payload.collectCashConfirmed
  ) {
    throw new Error(
      `UNPAID ORDER: Collect ${order.totalAmount} BDT cash from student and confirm cash collection to release food.`,
    );
  }

  // 6. Atomic Database Lock (Prevents Simultaneous Double-Scan Race Condition)
  const now = new Date();
  const lockResult = await prisma.foodOrder.updateMany({
    where: {
      id: order.id,
      tokenStatus: TokenStatus.ISSUED,
    },
    data: {
      tokenStatus: TokenStatus.CONSUMED,
      orderStatus: FoodOrderStatus.COMPLETED,
      consumedAt: now,
      ...(order.paymentStatus === FoodPaymentStatus.UNPAID
        ? {
            paymentStatus: FoodPaymentStatus.PAID,
            paidAt: now,
          }
        : {}),
    },
  });

  if (lockResult.count === 0) {
    throw new Error(
      "CONCURRENT SCAN BLOCKED: This token was just redeemed milliseconds ago!",
    );
  }

  return {
    verified: true,
    message: "VERIFIED & REDEEMED — Safe to serve food.",
    orderCode: order.orderCode,
    mealSlot: order.mealSlot,
    totalAmount: order.totalAmount,
    paymentStatus: FoodPaymentStatus.PAID,
    consumedAt: now,
    studentVerification: {
      name: order.student.name,
      studentUniId: order.student.studentUniId,
      photoUrl: order.student.user.imageUrl,
      roomNumber: order.student.room?.roomNumber ?? "N/A",
    },
    itemsToServe: order.items,
  };
};

const updateOrderStatus = async (
  canteenUserId: string,
  orderId: string,
  payload: IUpdateOrderStatusPayload,
) => {
  const canteen = await verifyCanteenOwner(canteenUserId);
  const order = await prisma.foodOrder.findFirst({
    where: { id: orderId, canteenId: canteen.id },
  });

  if (!order) {
    throw new Error("Order not found in your canteen.");
  }

  if (payload.orderStatus === FoodOrderStatus.NO_SHOW) {
    if (order.tokenStatus === TokenStatus.CONSUMED) {
      throw new Error("Cannot mark an already consumed order as NO_SHOW.");
    }

    return prisma.$transaction(async (tx) => {
      if (order.paymentMethod === FoodPaymentMethod.COUNTER_CASH) {
        const wallet = await tx.canteenWallet.upsert({
          where: { studentId: order.studentId },
          update: { noShowCount: { increment: 1 } },
          create: { studentId: order.studentId, noShowCount: 1 },
        });

        if (wallet.noShowCount >= 2) {
          const blockUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          await tx.canteenWallet.update({
            where: { studentId: order.studentId },
            data: { dueBlockedUntil: blockUntil, noShowCount: 0 },
          });
        }
      }

      return tx.foodOrder.update({
        where: { id: order.id },
        data: {
          orderStatus: FoodOrderStatus.NO_SHOW,
          tokenStatus: TokenStatus.EXPIRED,
        },
      });
    });
  }

  return prisma.foodOrder.update({
    where: { id: order.id },
    data: { orderStatus: payload.orderStatus },
  });
};

// ============================================================================
// 5. VERIFIED BUYER RATINGS & EVIDENCE-BASED HYGIENE COMPLAINTS
// ============================================================================

const createMealReview = async (
  userId: string,
  payload: ICreateMealReviewPayload,
) => {
  const student = await verifyResidentStudent(userId);

  const order = await prisma.foodOrder.findFirst({
    where: {
      id: payload.orderId,
      studentId: student.id,
      tokenStatus: TokenStatus.CONSUMED,
      items: { some: { menuItemId: payload.menuItemId } },
    },
  });

  if (!order) {
    throw new Error(
      "Only students who have actually picked up and consumed this meal item can submit a verified rating.",
    );
  }

  const review = await prisma.mealReview.create({
    data: {
      orderId: payload.orderId,
      menuItemId: payload.menuItemId,
      studentId: student.id,
      rating: payload.rating,
      comment: payload.comment,
    },
  });

  // SRS Section 5: Check Weighted Verified Rating Threshold (< 2.8 across >= 10 reviews)
  const aggregate = await prisma.mealReview.aggregate({
    where: { menuItemId: payload.menuItemId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  const totalReviews = aggregate._count.rating;
  const avgRating = Number((aggregate._avg.rating ?? 0).toFixed(2));
  const qualityAlertTriggered = totalReviews >= 10 && avgRating < 2.8;

  return {
    review,
    itemQualityMetrics: {
      totalVerifiedReviews: totalReviews,
      averageRating: avgRating,
      qualityAlertTriggered,
      alertMessage: qualityAlertTriggered
        ? "ADMIN QUALITY ALERT: Item average rating dropped below 2.8 across 10+ verified buyers."
        : null,
    },
  };
};

const createFoodComplaint = async (
  userId: string,
  payload: ICreateFoodComplaintPayload,
) => {
  const student = await verifyResidentStudent(userId);

  const order = await prisma.foodOrder.findFirst({
    where: {
      id: payload.orderId,
      studentId: student.id,
      tokenStatus: TokenStatus.CONSUMED,
    },
  });

  if (!order) {
    throw new Error(
      "You can only file a hygiene/quality complaint for a verified consumed order.",
    );
  }

  return prisma.foodComplaint.create({
    data: {
      orderId: order.id,
      studentId: student.id,
      canteenId: order.canteenId,
      title: payload.title,
      description: payload.description,
      evidenceUrls: payload.evidenceUrls as unknown as Prisma.InputJsonValue,
    },
  });
};

const resolveFoodComplaint = async (
  adminUserId: string,
  complaintId: string,
  payload: IResolveFoodComplaintPayload,
) => {
  const complaint = await prisma.foodComplaint.findUnique({
    where: { id: complaintId },
  });
  if (!complaint) {
    throw new Error("Food complaint not found.");
  }

  return prisma.$transaction(async (tx) => {
    if (payload.status === ComplaintStatus.WARNING_ISSUED) {
      await tx.canteenOwnerProfile.update({
        where: { id: complaint.canteenId },
        data: { warningCount: { increment: 1 } },
      });
    } else if (payload.status === ComplaintStatus.FINED) {
      await tx.canteenOwnerProfile.update({
        where: { id: complaint.canteenId },
        data: {
          totalFines: { increment: payload.fineAmount ?? 0 },
        },
      });
    }

    return tx.foodComplaint.update({
      where: { id: complaintId },
      data: {
        status: payload.status,
        fineAmount: payload.fineAmount ?? 0,
        adminNote: payload.adminNote,
        reviewedById: adminUserId,
        resolvedAt: new Date(),
      },
    });
  });
};

export const CanteenService = {
  createCanteenOwner,
  updateCanteenOwnerStatus,
  upsertMasterPriceItem,
  getHallMasterPrices,
  reviewMenuItemPrice,
  createMenuItem,
  updateMenuItem,
  getCanteenOwnMenu,
  getKitchenPrepSummary,
  getVendorSalesAndDueLedger,
  getStudentLiveMenu,
  getStudentMyOrders,
  createFoodOrder,
  cancelFoodOrder,
  getDigitalMealSlip,
  redeemFoodToken,
  updateOrderStatus,
  createMealReview,
  createFoodComplaint,
  resolveFoodComplaint,
};