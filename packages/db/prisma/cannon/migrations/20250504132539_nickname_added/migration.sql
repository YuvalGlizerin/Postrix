-- CreateTable
CREATE TABLE "leaderboard" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(100),
    "nickname" VARCHAR(100),
    "score" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaderboard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_username_key" ON "leaderboard"("username");
