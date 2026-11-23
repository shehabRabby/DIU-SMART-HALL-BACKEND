-- CreateEnum
CREATE TYPE "MealSlot" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER');

-- CreateEnum
CREATE TYPE "FoodCategory" AS ENUM ('RICE', 'CHICKEN', 'BEEF_MUTTON', 'FISH', 'DAL_VEGETABLE', 'BHORTA', 'BREAD_EGG', 'BIRYANI_SPECIAL', 'COMBO_THALI', 'DRINKS_SNACKS');

-- CreateEnum
CREATE TYPE "FoodPortion" AS ENUM ('REGULAR', 'HALF', 'FULL');

-- CreateEnum
CREATE TYPE "MenuApprovalStatus" AS ENUM ('APPROVED', 'PENDING_PRICE_APPROVAL', 'REJECTED');

-- CreateEnum
CREATE TYPE "FoodOrderStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "FoodPaymentMethod" AS ENUM ('BKASH', 'NAGAD', 'STRIPE', 'CANTEEN_WALLET', 'COUNTER_CASH');

-- CreateEnum
CREATE TYPE "FoodPaymentStatus" AS ENUM ('UNPAID', 'PAID', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "TokenStatus" AS ENUM ('ISSUED', 'CONSUMED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('PENDING', 'WARNING_ISSUED', 'FINED', 'DISMISSED');

-- CreateTable
CREATE TABLE "canteen_owner_profiles" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "totalFines" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "hallId" TEXT NOT NULL,

    CONSTRAINT "canteen_owner_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hall_master_price_items" (
    "id" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" "FoodCategory" NOT NULL,
    "portion" "FoodPortion" NOT NULL DEFAULT 'REGULAR',
    "maxAllowedTk" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hallId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "hall_master_price_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canteen_menu_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "category" "FoodCategory" NOT NULL,
    "portion" "FoodPortion" NOT NULL DEFAULT 'REGULAR',
    "price" DOUBLE PRECISION NOT NULL,
    "isRegular" BOOLEAN NOT NULL DEFAULT true,
    "isSpecial" BOOLEAN NOT NULL DEFAULT false,
    "availableDate" TIMESTAMP(3),
    "availableSlots" "MealSlot"[],
    "isCombo" BOOLEAN NOT NULL DEFAULT false,
    "comboDetails" JSONB NOT NULL DEFAULT '[]',
    "maxQuantity" INTEGER,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "approvalStatus" "MenuApprovalStatus" NOT NULL DEFAULT 'APPROVED',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hallId" TEXT NOT NULL,
    "canteenId" TEXT NOT NULL,
    "masterPriceId" TEXT,
    "approvedById" TEXT,

    CONSTRAINT "canteen_menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_orders" (
    "id" TEXT NOT NULL,
    "orderCode" TEXT NOT NULL,
    "qrToken" TEXT NOT NULL,
    "pickupPin" TEXT NOT NULL,
    "mealDate" TIMESTAMP(3) NOT NULL,
    "mealSlot" "MealSlot" NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "FoodPaymentMethod" NOT NULL,
    "paymentStatus" "FoodPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "orderStatus" "FoodOrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "tokenStatus" "TokenStatus" NOT NULL DEFAULT 'ISSUED',
    "paidAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "studentId" TEXT NOT NULL,
    "hallId" TEXT NOT NULL,
    "canteenId" TEXT NOT NULL,

    CONSTRAINT "food_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_order_items" (
    "id" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "portion" "FoodPortion" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "orderId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,

    CONSTRAINT "food_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "tranId" TEXT NOT NULL,
    "gateway" "FoodPaymentMethod" NOT NULL,
    "gatewayRefId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "status" "FoodPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "rawResponse" JSONB,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canteen_wallets" (
    "id" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "noShowCount" INTEGER NOT NULL DEFAULT 0,
    "dueBlockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "canteen_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_reviews" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "meal_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_complaints" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceUrls" JSONB NOT NULL DEFAULT '[]',
    "status" "ComplaintStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "fineAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "canteenId" TEXT NOT NULL,
    "reviewedById" TEXT,

    CONSTRAINT "food_complaints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "canteen_owner_profiles_userId_key" ON "canteen_owner_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "canteen_owner_profiles_hallId_key" ON "canteen_owner_profiles"("hallId");

-- CreateIndex
CREATE INDEX "idx_canteen_owner_hallId" ON "canteen_owner_profiles"("hallId");

-- CreateIndex
CREATE INDEX "idx_master_price_hallId" ON "hall_master_price_items"("hallId");

-- CreateIndex
CREATE UNIQUE INDEX "hall_master_price_items_hallId_itemName_portion_key" ON "hall_master_price_items"("hallId", "itemName", "portion");

-- CreateIndex
CREATE INDEX "idx_menu_hall_available" ON "canteen_menu_items"("hallId", "isAvailable", "approvalStatus");

-- CreateIndex
CREATE INDEX "idx_menu_canteenId" ON "canteen_menu_items"("canteenId");

-- CreateIndex
CREATE UNIQUE INDEX "food_orders_orderCode_key" ON "food_orders"("orderCode");

-- CreateIndex
CREATE UNIQUE INDEX "food_orders_qrToken_key" ON "food_orders"("qrToken");

-- CreateIndex
CREATE INDEX "idx_food_order_student_date" ON "food_orders"("studentId", "mealDate");

-- CreateIndex
CREATE INDEX "idx_food_order_hall_slot" ON "food_orders"("hallId", "mealDate", "mealSlot");

-- CreateIndex
CREATE INDEX "idx_food_order_canteen_status" ON "food_orders"("canteenId", "orderStatus");

-- CreateIndex
CREATE INDEX "idx_order_item_orderId" ON "food_order_items"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_tranId_key" ON "payment_transactions"("tranId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_gatewayRefId_key" ON "payment_transactions"("gatewayRefId");

-- CreateIndex
CREATE INDEX "idx_payment_tx_orderId" ON "payment_transactions"("orderId");

-- CreateIndex
CREATE INDEX "idx_payment_tx_studentId" ON "payment_transactions"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "canteen_wallets_studentId_key" ON "canteen_wallets"("studentId");

-- CreateIndex
CREATE INDEX "idx_review_menuItemId" ON "meal_reviews"("menuItemId");

-- CreateIndex
CREATE UNIQUE INDEX "meal_reviews_orderId_menuItemId_key" ON "meal_reviews"("orderId", "menuItemId");

-- CreateIndex
CREATE INDEX "idx_food_complaint_canteen_status" ON "food_complaints"("canteenId", "status");

-- CreateIndex
CREATE INDEX "idx_food_complaint_studentId" ON "food_complaints"("studentId");

-- AddForeignKey
ALTER TABLE "canteen_owner_profiles" ADD CONSTRAINT "canteen_owner_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canteen_owner_profiles" ADD CONSTRAINT "canteen_owner_profiles_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "halls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hall_master_price_items" ADD CONSTRAINT "hall_master_price_items_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "halls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hall_master_price_items" ADD CONSTRAINT "hall_master_price_items_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canteen_menu_items" ADD CONSTRAINT "canteen_menu_items_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "halls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canteen_menu_items" ADD CONSTRAINT "canteen_menu_items_canteenId_fkey" FOREIGN KEY ("canteenId") REFERENCES "canteen_owner_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canteen_menu_items" ADD CONSTRAINT "canteen_menu_items_masterPriceId_fkey" FOREIGN KEY ("masterPriceId") REFERENCES "hall_master_price_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canteen_menu_items" ADD CONSTRAINT "canteen_menu_items_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_orders" ADD CONSTRAINT "food_orders_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_orders" ADD CONSTRAINT "food_orders_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "halls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_orders" ADD CONSTRAINT "food_orders_canteenId_fkey" FOREIGN KEY ("canteenId") REFERENCES "canteen_owner_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_order_items" ADD CONSTRAINT "food_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "food_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_order_items" ADD CONSTRAINT "food_order_items_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "canteen_menu_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "food_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canteen_wallets" ADD CONSTRAINT "canteen_wallets_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_reviews" ADD CONSTRAINT "meal_reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "food_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_reviews" ADD CONSTRAINT "meal_reviews_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "canteen_menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_reviews" ADD CONSTRAINT "meal_reviews_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_complaints" ADD CONSTRAINT "food_complaints_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "food_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_complaints" ADD CONSTRAINT "food_complaints_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_complaints" ADD CONSTRAINT "food_complaints_canteenId_fkey" FOREIGN KEY ("canteenId") REFERENCES "canteen_owner_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_complaints" ADD CONSTRAINT "food_complaints_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
