-- AlterTable
ALTER TABLE "Match" ALTER COLUMN "score" SET DEFAULT '';

-- AlterTable
ALTER TABLE "Match" ALTER COLUMN "winnerSide" DROP NOT NULL;
