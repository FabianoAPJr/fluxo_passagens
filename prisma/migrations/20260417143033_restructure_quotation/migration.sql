/*
  Warnings:

  - You are about to drop the column `airline` on the `Quotation` table. All the data in the column will be lost.
  - You are about to drop the column `outboundFlight` on the `Quotation` table. All the data in the column will be lost.
  - You are about to drop the column `returnFlight` on the `Quotation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Quotation" DROP COLUMN "airline",
DROP COLUMN "outboundFlight",
DROP COLUMN "returnFlight",
ADD COLUMN     "accommodationLink" TEXT,
ADD COLUMN     "accommodationType" TEXT,
ADD COLUMN     "locatorCode" TEXT,
ADD COLUMN     "outboundAirline" TEXT,
ADD COLUMN     "outboundArrivalTime" TEXT,
ADD COLUMN     "outboundDate" TIMESTAMP(3),
ADD COLUMN     "outboundDepartureTime" TEXT,
ADD COLUMN     "outboundDestinationCode" TEXT,
ADD COLUMN     "outboundFlightNumber" TEXT,
ADD COLUMN     "outboundOriginCode" TEXT,
ADD COLUMN     "returnAirline" TEXT,
ADD COLUMN     "returnArrivalTime" TEXT,
ADD COLUMN     "returnDate" TIMESTAMP(3),
ADD COLUMN     "returnDepartureTime" TEXT,
ADD COLUMN     "returnDestinationCode" TEXT,
ADD COLUMN     "returnFlightNumber" TEXT,
ADD COLUMN     "returnOriginCode" TEXT;
