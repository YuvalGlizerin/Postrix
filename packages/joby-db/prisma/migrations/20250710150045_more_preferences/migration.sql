/*
  Warnings:

  - Made the column `job_preference` on table `job_preferences` required. This step will fail if there are existing NULL values in that column.
  - Made the column `alert_schedule` on table `job_preferences` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "DatePosted" AS ENUM ('anyTime', 'pastMonth', 'pastWeek', 'past24Hours');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('fullTime', 'partTime', 'contract', 'internship');

-- CreateEnum
CREATE TYPE "OnsiteRemote" AS ENUM ('onsite', 'remote', 'hybrid');

-- AlterTable
ALTER TABLE "job_preferences" ADD COLUMN     "companies" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "datePosted" "DatePosted",
ADD COLUMN     "jobType" "JobType",
ADD COLUMN     "keywords" TEXT[],
ADD COLUMN     "location" TEXT,
ADD COLUMN     "onsiteRemote" "OnsiteRemote",
ADD COLUMN     "time_zone" TEXT NOT NULL DEFAULT 'UTC',
ALTER COLUMN "job_preference" SET NOT NULL,
ALTER COLUMN "alert_schedule" SET NOT NULL,
ALTER COLUMN "alert_schedule" SET DATA TYPE TEXT;
