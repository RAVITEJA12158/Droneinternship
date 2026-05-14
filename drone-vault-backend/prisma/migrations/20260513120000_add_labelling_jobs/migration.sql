-- CreateEnum
CREATE TYPE "LabellingJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "LabellingJob" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "orthomosaicId" TEXT NOT NULL,
    "labelMapUrl" TEXT,
    "ndviMapUrl" TEXT,
    "ndreMapUrl" TEXT,
    "stats" JSONB,
    "status" "LabellingJobStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabellingJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LabellingJob_orthomosaicId_key" ON "LabellingJob"("orthomosaicId");

-- CreateIndex
CREATE INDEX "LabellingJob_missionId_idx" ON "LabellingJob"("missionId");

-- AddForeignKey
ALTER TABLE "LabellingJob" ADD CONSTRAINT "LabellingJob_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabellingJob" ADD CONSTRAINT "LabellingJob_orthomosaicId_fkey" FOREIGN KEY ("orthomosaicId") REFERENCES "Orthomosaic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
