/*
  Warnings:

  - A unique constraint covering the columns `[user_id]` on the table `job_preferences` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "job_preferences_user_id_key" ON "job_preferences"("user_id");
