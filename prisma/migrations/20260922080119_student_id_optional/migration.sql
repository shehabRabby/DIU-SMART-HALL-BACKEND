-- DropIndex
DROP INDEX "students_studentUniID_key";

-- AlterTable
ALTER TABLE "students" ALTER COLUMN "studentUniID" DROP NOT NULL;
