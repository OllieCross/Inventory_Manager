-- CreateEnum
CREATE TYPE "ChemicalCompound" AS ENUM ('H2O', 'O2', 'CO2', 'C4H10C3H8', 'N2', 'H2', 'LN2', 'Other');

-- CreateTable
CREATE TABLE "Tank" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "qrCode" TEXT,
    "chemicalCompound" "ChemicalCompound" NOT NULL DEFAULT 'Other',
    "unit" TEXT NOT NULL,
    "fullCapacity" DOUBLE PRECISION NOT NULL,
    "currentCapacity" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Tank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TankImage" (
    "id" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TankImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TankDocument" (
    "id" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "DocType" NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TankDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TankLogbookEntry" (
    "id" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "comment" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TankLogbookEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventTank" (
    "eventId" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "quantityNeeded" DOUBLE PRECISION,

    CONSTRAINT "EventTank_pkey" PRIMARY KEY ("eventId","tankId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tank_qrCode_key" ON "Tank"("qrCode");

-- CreateIndex
CREATE UNIQUE INDEX "TankImage_fileKey_key" ON "TankImage"("fileKey");

-- CreateIndex
CREATE UNIQUE INDEX "TankDocument_fileKey_key" ON "TankDocument"("fileKey");

-- AddForeignKey
ALTER TABLE "Tank" ADD CONSTRAINT "Tank_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tank" ADD CONSTRAINT "Tank_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TankImage" ADD CONSTRAINT "TankImage_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "Tank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TankDocument" ADD CONSTRAINT "TankDocument_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "Tank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TankLogbookEntry" ADD CONSTRAINT "TankLogbookEntry_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "Tank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TankLogbookEntry" ADD CONSTRAINT "TankLogbookEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTank" ADD CONSTRAINT "EventTank_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTank" ADD CONSTRAINT "EventTank_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "Tank"("id") ON DELETE CASCADE ON UPDATE CASCADE;
