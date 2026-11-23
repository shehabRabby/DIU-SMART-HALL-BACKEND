/*
  Warnings:

  - You are about to drop the column `attachmentType` on the `notices` table. All the data in the column will be lost.
  - You are about to drop the column `attachmentUrl` on the `notices` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "notices" DROP COLUMN "attachmentType",
DROP COLUMN "attachmentUrl",
ADD COLUMN     "attachments" JSONB NOT NULL DEFAULT '[]';
