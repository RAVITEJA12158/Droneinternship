-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "CaptureStatus" AS ENUM ('RAW', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('RGB_JPG', 'MS_TIF', 'MISSION_PLAN', 'METADATA_JSON', 'OTHER');

-- CreateEnum
CREATE TYPE "MapType" AS ENUM ('RGB', 'MULTISPECTRAL', 'NDVI', 'DSM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "captureDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaptureSet" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "shotNumber" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3),
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "status" "CaptureStatus" NOT NULL DEFAULT 'RAW',

    CONSTRAINT "CaptureSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "captureSetId" TEXT,
    "fileType" "FileType" NOT NULL,
    "originalName" TEXT NOT NULL,
    "relativePath" TEXT NOT NULL,
    "thumbnailPath" TEXT,
    "size" BIGINT NOT NULL,
    "checksum" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Orthomosaic" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "type" "MapType" NOT NULL,
    "relativePath" TEXT NOT NULL,
    "previewPath" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Orthomosaic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE INDEX "Mission_projectId_idx" ON "Mission"("projectId");

-- CreateIndex
CREATE INDEX "CaptureSet_missionId_idx" ON "CaptureSet"("missionId");

-- CreateIndex
CREATE INDEX "File_missionId_idx" ON "File"("missionId");

-- CreateIndex
CREATE INDEX "File_captureSetId_idx" ON "File"("captureSetId");

-- CreateIndex
CREATE INDEX "Orthomosaic_missionId_idx" ON "Orthomosaic"("missionId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptureSet" ADD CONSTRAINT "CaptureSet_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_captureSetId_fkey" FOREIGN KEY ("captureSetId") REFERENCES "CaptureSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orthomosaic" ADD CONSTRAINT "Orthomosaic_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
