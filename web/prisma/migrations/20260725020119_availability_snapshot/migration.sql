-- CreateTable
CREATE TABLE "AvailabilitySnapshot" (
    "id" TEXT NOT NULL DEFAULT 'latest',
    "slots" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilitySnapshot_pkey" PRIMARY KEY ("id")
);
