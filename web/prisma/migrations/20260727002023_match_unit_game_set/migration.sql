-- CreateEnum
CREATE TYPE "MatchUnit" AS ENUM ('game', 'set');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "unit" "MatchUnit" NOT NULL DEFAULT 'set';

-- CreateIndex
CREATE INDEX "Match_playSessionId_unit_idx" ON "Match"("playSessionId", "unit");
