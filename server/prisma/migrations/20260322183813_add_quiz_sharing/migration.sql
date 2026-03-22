-- CreateEnum
CREATE TYPE "QuizAccessLevel" AS ENUM ('TAKER', 'VIEWER');

-- CreateEnum
CREATE TYPE "ShareStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "displayName" TEXT;

-- CreateTable
CREATE TABLE "QuizShare" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "accessLevel" "QuizAccessLevel" NOT NULL DEFAULT 'TAKER',
    "status" "ShareStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "sharedBy" TEXT NOT NULL,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "QuizShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuizShare_token_key" ON "QuizShare"("token");

-- CreateIndex
CREATE INDEX "QuizShare_quizId_idx" ON "QuizShare"("quizId");

-- CreateIndex
CREATE INDEX "QuizShare_email_idx" ON "QuizShare"("email");

-- CreateIndex
CREATE INDEX "QuizShare_token_idx" ON "QuizShare"("token");

-- CreateIndex
CREATE UNIQUE INDEX "QuizShare_quizId_email_key" ON "QuizShare"("quizId", "email");

-- AddForeignKey
ALTER TABLE "QuizShare" ADD CONSTRAINT "QuizShare_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
