/*
  Warnings:

  - You are about to drop the column `studentUniID` on the `students` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[studentUniId]` on the table `students` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "students_studentUniID_key";

-- AlterTable
ALTER TABLE "students" DROP COLUMN "studentUniID",
ADD COLUMN     "studentUniId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "students_studentUniId_key" ON "students"("studentUniId");
