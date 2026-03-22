-- Add columns that were added via prisma db push but never had migration files

ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "subject" TEXT;
ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "metaVersion" TEXT;
ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "metaCreated" TEXT;

ALTER TABLE "QuizQuestion" ADD COLUMN IF NOT EXISTS "difficulty" TEXT;
ALTER TABLE "QuizQuestion" ADD COLUMN IF NOT EXISTS "topic" TEXT;
ALTER TABLE "QuizQuestion" ADD COLUMN IF NOT EXISTS "tags" JSONB;
