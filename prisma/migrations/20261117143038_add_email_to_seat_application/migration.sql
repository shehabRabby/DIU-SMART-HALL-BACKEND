/*
  Warnings:

  - Added the required column `email` to the `seat_applications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "seat_applications" ADD COLUMN     "email" TEXT NOT NULL;
