-- CreateEnum
CREATE TYPE "ReservationType" AS ENUM ('WITH_RESERVATION', 'WITHOUT_RESERVATION');

-- CreateEnum
CREATE TYPE "AssociatedApp" AS ENUM ('PASS', 'GO', 'CARE');

-- AlterTable
ALTER TABLE "businesses"
ADD COLUMN "reservation_type" "ReservationType" NOT NULL DEFAULT 'WITHOUT_RESERVATION',
ADD COLUMN "associated_apps" "AssociatedApp"[] DEFAULT ARRAY[]::"AssociatedApp"[];
