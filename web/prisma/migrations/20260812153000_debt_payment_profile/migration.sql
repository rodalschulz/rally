-- CreateEnum
CREATE TYPE "PaymentWallet" AS ENUM ('yape', 'plin', 'either');

-- AlterTable User: optional Yape/Plin contact for P2P debt UX
ALTER TABLE "User" ADD COLUMN "paymentPhone" TEXT;
ALTER TABLE "User" ADD COLUMN "paymentWallet" "PaymentWallet";

-- AlterTable Debt: debtor claimed they paid outside the app
ALTER TABLE "Debt" ADD COLUMN "paymentClaimedAt" TIMESTAMP(3);
