-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RequestStatus" ADD VALUE 'PENDING_MANAGER_2';
ALTER TYPE "RequestStatus" ADD VALUE 'REJECTED_BY_MANAGER_2';

-- AlterTable
ALTER TABLE "TravelRequest" ADD COLUMN     "manager2Id" TEXT;

-- AddForeignKey
ALTER TABLE "TravelRequest" ADD CONSTRAINT "TravelRequest_manager2Id_fkey" FOREIGN KEY ("manager2Id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
