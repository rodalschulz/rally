-- AlterTable
ALTER TABLE "PlaySession" ADD COLUMN "recogeBolasAmount" DECIMAL(10,2),
ADD COLUMN "recogeBolasPayerId" TEXT;

-- AddForeignKey
ALTER TABLE "PlaySession" ADD CONSTRAINT "PlaySession_recogeBolasPayerId_fkey" FOREIGN KEY ("recogeBolasPayerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
