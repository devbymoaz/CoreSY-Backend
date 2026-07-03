-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('MOTORCYCLE', 'CAR', 'BICYCLE', 'VAN');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DriverAvailabilityStatus" AS ENUM ('ONLINE', 'OFFLINE', 'BUSY', 'ON_DELIVERY');

-- CreateEnum
CREATE TYPE "DriverGender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "profile_photo" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "gender" "DriverGender",
    "national_id" TEXT NOT NULL,
    "driving_license" TEXT NOT NULL,
    "national_id_document" TEXT,
    "driving_license_document" TEXT,
    "insurance_document" TEXT,
    "vehicle_type" "VehicleType" NOT NULL,
    "vehicle_brand" TEXT,
    "vehicle_model" TEXT,
    "vehicle_registration_number" TEXT NOT NULL,
    "vehicle_plate_number" TEXT NOT NULL,
    "vehicle_images" TEXT[],
    "status" "DriverStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "availability_status" "DriverAvailabilityStatus" NOT NULL DEFAULT 'OFFLINE',
    "is_online" BOOLEAN NOT NULL DEFAULT false,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "total_deliveries" INTEGER NOT NULL DEFAULT 0,
    "completed_deliveries" INTEGER NOT NULL DEFAULT 0,
    "cancelled_deliveries" INTEGER NOT NULL DEFAULT 0,
    "current_latitude" DECIMAL(10,7),
    "current_longitude" DECIMAL(10,7),
    "location_updated_at" TIMESTAMP(3),
    "governorate_id" TEXT NOT NULL,
    "rejection_reason" TEXT,
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "last_login" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "drivers_driver_id_key" ON "drivers"("driver_id");
CREATE UNIQUE INDEX "drivers_email_key" ON "drivers"("email");
CREATE UNIQUE INDEX "drivers_phone_number_key" ON "drivers"("phone_number");
CREATE UNIQUE INDEX "drivers_national_id_key" ON "drivers"("national_id");
CREATE UNIQUE INDEX "drivers_driving_license_key" ON "drivers"("driving_license");
CREATE UNIQUE INDEX "drivers_vehicle_registration_number_key" ON "drivers"("vehicle_registration_number");
CREATE UNIQUE INDEX "drivers_vehicle_plate_number_key" ON "drivers"("vehicle_plate_number");
CREATE INDEX "drivers_driver_id_idx" ON "drivers"("driver_id");
CREATE INDEX "drivers_email_idx" ON "drivers"("email");
CREATE INDEX "drivers_phone_number_idx" ON "drivers"("phone_number");
CREATE INDEX "drivers_status_idx" ON "drivers"("status");
CREATE INDEX "drivers_availability_status_idx" ON "drivers"("availability_status");
CREATE INDEX "drivers_vehicle_type_idx" ON "drivers"("vehicle_type");
CREATE INDEX "drivers_governorate_id_idx" ON "drivers"("governorate_id");
CREATE INDEX "drivers_rating_idx" ON "drivers"("rating");
CREATE INDEX "drivers_is_online_idx" ON "drivers"("is_online");

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_governorate_id_fkey" FOREIGN KEY ("governorate_id") REFERENCES "governorates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
