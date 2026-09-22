/*
  Warnings:

  - A unique constraint covering the columns `[studentUniID]` on the table `students` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "students_studentUniID_key" ON "students"("studentUniID");
