-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'FULL', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WarningStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "expelledAt" TIMESTAMP(3),
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "hallId" TEXT,
ADD COLUMN     "isExpelled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isResident" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentPhoneNumber" TEXT,
ADD COLUMN     "roomId" TEXT,
ADD COLUMN     "warningCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "halls" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "genderType" "Gender" NOT NULL,
    "totalFloors" INTEGER NOT NULL,
    "roomsPerFloor" INTEGER NOT NULL,
    "defaultRoomCapacity" INTEGER NOT NULL DEFAULT 4,
    "monthlyFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "halls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "floor" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "occupiedCount" INTEGER NOT NULL DEFAULT 0,
    "status" "RoomStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hallId" TEXT NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seat_applications" (
    "id" TEXT NOT NULL,
    "studentUniId" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "personalPhoneNumber" TEXT NOT NULL,
    "parentPhoneNumber" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "previousAddress" TEXT NOT NULL,
    "reason" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "studentId" TEXT NOT NULL,
    "allocatedHallId" TEXT,
    "allocatedRoomId" TEXT,
    "reviewedById" TEXT,

    CONSTRAINT "seat_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_change_requests" (
    "id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "studentId" TEXT NOT NULL,
    "currentRoomId" TEXT NOT NULL,
    "targetHallId" TEXT,
    "targetRoomId" TEXT,
    "reviewedById" TEXT,

    CONSTRAINT "room_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_warnings" (
    "id" TEXT NOT NULL,
    "strikeNumber" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "WarningStatus" NOT NULL DEFAULT 'ACTIVE',
    "revokeReason" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "studentId" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "revokedById" TEXT,

    CONSTRAINT "student_warnings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "halls_name_key" ON "halls"("name");

-- CreateIndex
CREATE UNIQUE INDEX "halls_shortName_key" ON "halls"("shortName");

-- CreateIndex
CREATE INDEX "idx_hall_genderType" ON "halls"("genderType");

-- CreateIndex
CREATE INDEX "idx_hall_isActive" ON "halls"("isActive");

-- CreateIndex
CREATE INDEX "idx_room_hall_floor" ON "rooms"("hallId", "floor");

-- CreateIndex
CREATE INDEX "idx_room_status" ON "rooms"("status");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_hallId_roomNumber_key" ON "rooms"("hallId", "roomNumber");

-- CreateIndex
CREATE INDEX "idx_seat_app_studentId" ON "seat_applications"("studentId");

-- CreateIndex
CREATE INDEX "idx_seat_app_status" ON "seat_applications"("status");

-- CreateIndex
CREATE INDEX "idx_seat_app_gender" ON "seat_applications"("gender");

-- CreateIndex
CREATE INDEX "idx_room_change_studentId" ON "room_change_requests"("studentId");

-- CreateIndex
CREATE INDEX "idx_room_change_status" ON "room_change_requests"("status");

-- CreateIndex
CREATE INDEX "idx_warning_studentId" ON "student_warnings"("studentId");

-- CreateIndex
CREATE INDEX "idx_warning_status" ON "student_warnings"("status");

-- CreateIndex
CREATE INDEX "idx_student_hallId" ON "students"("hallId");

-- CreateIndex
CREATE INDEX "idx_student_roomId" ON "students"("roomId");

-- CreateIndex
CREATE INDEX "idx_student_isResident" ON "students"("isResident");

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "halls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_applications" ADD CONSTRAINT "seat_applications_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_applications" ADD CONSTRAINT "seat_applications_allocatedHallId_fkey" FOREIGN KEY ("allocatedHallId") REFERENCES "halls"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_applications" ADD CONSTRAINT "seat_applications_allocatedRoomId_fkey" FOREIGN KEY ("allocatedRoomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_applications" ADD CONSTRAINT "seat_applications_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_change_requests" ADD CONSTRAINT "room_change_requests_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_change_requests" ADD CONSTRAINT "room_change_requests_currentRoomId_fkey" FOREIGN KEY ("currentRoomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_change_requests" ADD CONSTRAINT "room_change_requests_targetHallId_fkey" FOREIGN KEY ("targetHallId") REFERENCES "halls"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_change_requests" ADD CONSTRAINT "room_change_requests_targetRoomId_fkey" FOREIGN KEY ("targetRoomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_change_requests" ADD CONSTRAINT "room_change_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_warnings" ADD CONSTRAINT "student_warnings_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_warnings" ADD CONSTRAINT "student_warnings_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_warnings" ADD CONSTRAINT "student_warnings_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "halls"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
