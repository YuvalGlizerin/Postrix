/*
  Warnings:

  - You are about to drop the column `time_zone` on the `job_preferences` table. All the data in the column will be lost.
  - You are about to alter the column `alert_schedule` on the `job_preferences` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `companies` on the `job_preferences` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `location` on the `job_preferences` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `keywords` on the `job_preferences` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.

*/
-- AlterTable
ALTER TABLE "job_preferences" DROP COLUMN "time_zone",
ALTER COLUMN "alert_schedule" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "companies" SET DATA TYPE VARCHAR(255)[],
ALTER COLUMN "location" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "keywords" SET NOT NULL,
ALTER COLUMN "keywords" DROP DEFAULT,
ALTER COLUMN "keywords" SET DATA TYPE VARCHAR(255);
