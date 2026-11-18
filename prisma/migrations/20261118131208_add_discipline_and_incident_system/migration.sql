/*
  Warnings:

  - A unique constraint covering the columns `[incidentId]` on the table `student_warnings` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "WarningSeverity" AS ENUM ('MINOR', 'MODERATE', 'SEVERE');

-- CreateEnum
CREATE TYPE "IncidentCategory" AS ENUM ('NOISE_DISTURBANCE', 'ROOMMATE_CONFLICT', 'PROPERTY_DAMAGE', 'UNAUTHORIZED_GUEST', 'LATE_ENTRY', 'CURFEW_VIOLATION', 'DISCIPLINARY_BREACH', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'MEDIATING', 'RESOLVED', 'ESCALATED', 'DISMISSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WarningStatus" ADD VALUE 'SHOW_CAUSE';
ALTER TYPE "WarningStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "student_warnings" ADD COLUMN     "appealDeadline" TIMESTAMP(3),
ADD COLUMN     "appealText" TEXT,
ADD COLUMN     "appealedAt" TIMESTAMP(3),
ADD COLUMN     "category" "IncidentCategory" NOT NULL DEFAULT 'DISCIPLINARY_BREACH',
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "fineAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "finePaidAt" TIMESTAMP(3),
ADD COLUMN     "hallId" TEXT,
ADD COLUMN     "incidentId" TEXT,
ADD COLUMN     "isFinePaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "severity" "WarningSeverity" NOT NULL DEFAULT 'MINOR',
ADD COLUMN     "title" TEXT NOT NULL DEFAULT 'Disciplinary Warning';

-- CreateTable
CREATE TABLE "incident_reports" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "IncidentCategory" NOT NULL DEFAULT 'OTHER',
    "severity" "WarningSeverity" NOT NULL DEFAULT 'MINOR',
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "mediationNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reportedById" TEXT NOT NULL,
    "accusedStudentId" TEXT NOT NULL,
    "hallId" TEXT,
    "roomId" TEXT,
    "resolvedById" TEXT,

    CONSTRAINT "incident_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_incident_accusedStudentId" ON "incident_reports"("accusedStudentId");

-- CreateIndex
CREATE INDEX "idx_incident_hallId" ON "incident_reports"("hallId");

-- CreateIndex
CREATE INDEX "idx_incident_status" ON "incident_reports"("status");

-- CreateIndex
CREATE UNIQUE INDEX "student_warnings_incidentId_key" ON "student_warnings"("incidentId");

-- CreateIndex
CREATE INDEX "idx_warning_hallId" ON "student_warnings"("hallId");

-- CreateIndex
CREATE INDEX "idx_warning_expiresAt" ON "student_warnings"("expiresAt");

-- AddForeignKey
ALTER TABLE "student_warnings" ADD CONSTRAINT "student_warnings_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "halls"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_warnings" ADD CONSTRAINT "student_warnings_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incident_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_accusedStudentId_fkey" FOREIGN KEY ("accusedStudentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "halls"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
