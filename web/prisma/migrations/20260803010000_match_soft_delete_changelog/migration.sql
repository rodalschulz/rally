-- CreateEnum
CREATE TYPE "MatchChangeAction" AS ENUM ('created', 'updated', 'deleted', 'restored');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedById" TEXT;

-- CreateTable
CREATE TABLE "MatchChangeLog" (
    "id" TEXT NOT NULL,
    "playSessionId" TEXT NOT NULL,
    "matchId" TEXT,
    "actorId" TEXT NOT NULL,
    "action" "MatchChangeAction" NOT NULL,
    "unit" "MatchUnit" NOT NULL,
    "summary" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Match_playSessionId_deletedAt_idx" ON "Match"("playSessionId", "deletedAt");

-- CreateIndex
CREATE INDEX "MatchChangeLog_playSessionId_createdAt_idx" ON "MatchChangeLog"("playSessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchChangeLog" ADD CONSTRAINT "MatchChangeLog_playSessionId_fkey" FOREIGN KEY ("playSessionId") REFERENCES "PlaySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchChangeLog" ADD CONSTRAINT "MatchChangeLog_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchChangeLog" ADD CONSTRAINT "MatchChangeLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
