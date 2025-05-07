/*
  Warnings:

  - You are about to drop the column `nickname` on the `leaderboard` table. All the data in the column will be lost.
  - You are about to drop the column `nickname3` on the `leaderboard` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "leaderboard" DROP COLUMN "nickname",
DROP COLUMN "nickname3";
