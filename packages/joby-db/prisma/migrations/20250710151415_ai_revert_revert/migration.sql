/*
  Warnings:

  - The `keywords` column on the `job_preferences` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "job_preferences" DROP COLUMN "keywords",
ADD COLUMN     "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[];
