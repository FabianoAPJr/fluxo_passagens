-- AlterTable
ALTER TABLE "User" ADD COLUMN     "manager2Id" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_manager2Id_fkey" FOREIGN KEY ("manager2Id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
