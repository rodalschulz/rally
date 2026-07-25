-- AlterTable
ALTER TABLE "PlaySession" ADD COLUMN     "allowedUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "maxAttendees" INTEGER;
