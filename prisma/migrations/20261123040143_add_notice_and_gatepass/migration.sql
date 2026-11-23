-- CreateEnum
CREATE TYPE "NoticeCategory" AS ENUM ('GENERAL', 'URGENT', 'MAINTENANCE', 'DINING', 'EVENT', 'DISCIPLINE', 'HALL_FEE_BILLING', 'SEAT_ALLOCATION', 'SECURITY_CURFEW', 'HOLIDAY_VACATION', 'OTHERS');

-- CreateEnum
CREATE TYPE "NoticePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('PDF', 'DOCX', 'IMAGE');

-- CreateEnum
CREATE TYPE "PassType" AS ENUM ('LATE_ENTRY', 'NIGHT_OUT', 'HOME_LEAVE', 'DAY_OUT', 'MEDICAL_EMERGENCY', 'ACADEMIC_TOUR', 'COMPETITION_EVENT', 'FAMILY_URGENCY', 'OTHERS');

-- CreateEnum
CREATE TYPE "GatePassStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CHECKED_OUT', 'RETURNED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "notices" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" "NoticeCategory" NOT NULL DEFAULT 'GENERAL',
    "priority" "NoticePriority" NOT NULL DEFAULT 'NORMAL',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "attachmentUrl" TEXT,
    "attachmentType" "AttachmentType",
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hallId" TEXT,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gate_passes" (
    "id" TEXT NOT NULL,
    "passCode" TEXT,
    "qrToken" TEXT,
    "passType" "PassType" NOT NULL,
    "reason" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "emergencyContact" TEXT NOT NULL,
    "departureAt" TIMESTAMP(3) NOT NULL,
    "expectedReturnAt" TIMESTAMP(3) NOT NULL,
    "status" "GatePassStatus" NOT NULL DEFAULT 'PENDING',
    "isQrUsed" BOOLEAN NOT NULL DEFAULT false,
    "checkedOutAt" TIMESTAMP(3),
    "actualReturnAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "studentId" TEXT NOT NULL,
    "hallId" TEXT NOT NULL,
    "reviewedById" TEXT,

    CONSTRAINT "gate_passes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_notice_feed_query" ON "notices"("hallId", "isPinned", "expiresAt", "createdAt");

-- CreateIndex
CREATE INDEX "idx_notice_category" ON "notices"("category");

-- CreateIndex
CREATE UNIQUE INDEX "gate_passes_passCode_key" ON "gate_passes"("passCode");

-- CreateIndex
CREATE UNIQUE INDEX "gate_passes_qrToken_key" ON "gate_passes"("qrToken");

-- CreateIndex
CREATE INDEX "idx_gatepass_student_status" ON "gate_passes"("studentId", "status");

-- CreateIndex
CREATE INDEX "idx_gatepass_hall_status" ON "gate_passes"("hallId", "status");

-- CreateIndex
CREATE INDEX "idx_gatepass_expectedReturnAt" ON "gate_passes"("expectedReturnAt");

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "halls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_passes" ADD CONSTRAINT "gate_passes_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_passes" ADD CONSTRAINT "gate_passes_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "halls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_passes" ADD CONSTRAINT "gate_passes_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
