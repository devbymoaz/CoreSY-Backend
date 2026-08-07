/**
 * Driver validators.
 * Zod schemas for CoreSY Go driver management requests.
 */

const { z } = require('zod');
const {
  VEHICLE_TYPE,
  DRIVER_STATUS,
  DRIVER_AVAILABILITY_STATUS,
  DRIVER_GENDER,
} = require('../../../constants');

const documentUrlSchema = z.string().url().or(z.string().min(1).max(500));

const registerDriverSchema = z
  .object({
    fullName: z.string().min(2).max(255).trim(),
    email: z.string().email().trim().toLowerCase(),
    phoneNumber: z.string().min(8).max(20).trim(),
    password: z.string().min(8).max(100),
    confirmPassword: z.string().min(8).max(100),
    dateOfBirth: z
      .string()
      .datetime()
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
      .optional()
      .nullable(),
    gender: z.nativeEnum(DRIVER_GENDER).optional().nullable(),
    nationalId: z.string().min(5).max(50).trim(),
    drivingLicense: z.string().min(5).max(50).trim(),
    vehicleType: z.nativeEnum(VEHICLE_TYPE),
    vehicleBrand: z.string().min(1).max(100).trim().optional().nullable(),
    vehicleModel: z.string().min(1).max(100).trim().optional().nullable(),
    vehicleRegistrationNumber: z.string().min(3).max(50).trim(),
    vehiclePlateNumber: z.string().min(3).max(50).trim(),
    governorateId: z.string().uuid(),
    profilePhoto: documentUrlSchema.optional().nullable(),
    nationalIdDocument: documentUrlSchema.optional().nullable(),
    drivingLicenseDocument: documentUrlSchema.optional().nullable(),
    insuranceDocument: documentUrlSchema.optional().nullable(),
    vehicleImages: z.array(documentUrlSchema).max(10).optional().default([]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const loginDriverSchema = z
  .object({
    identifier: z.string().min(3).trim().optional(),
    email: z.string().email().trim().toLowerCase().optional(),
    phoneNumber: z.string().min(8).max(20).trim().optional(),
    password: z.string().min(1),
  })
  .refine((data) => data.identifier || data.email || data.phoneNumber, {
    message: 'Email or phone number is required',
    path: ['identifier'],
  })
  .transform((data) => ({
    identifier: data.identifier || data.email || data.phoneNumber,
    password: data.password,
  }));

const updateProfileSchema = z
  .object({
    fullName: z.string().min(2).max(255).trim().optional(),
    phoneNumber: z.string().min(8).max(20).trim().optional(),
    dateOfBirth: z
      .string()
      .datetime()
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
      .optional()
      .nullable(),
    gender: z.nativeEnum(DRIVER_GENDER).optional().nullable(),
    profilePhoto: documentUrlSchema.optional().nullable(),
    vehicleBrand: z.string().min(1).max(100).trim().optional().nullable(),
    vehicleModel: z.string().min(1).max(100).trim().optional().nullable(),
    governorateId: z.string().uuid().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

const uploadDocumentsSchema = z
  .object({
    nationalIdDocument: documentUrlSchema.optional(),
    drivingLicenseDocument: documentUrlSchema.optional(),
    insuranceDocument: documentUrlSchema.optional(),
    profilePhoto: documentUrlSchema.optional(),
  })
  .refine(
    (data) =>
      data.nationalIdDocument ||
      data.drivingLicenseDocument ||
      data.insuranceDocument ||
      data.profilePhoto,
    { message: 'At least one document must be provided' },
  );

const uploadVehicleSchema = z.object({
  vehicleImages: z.array(documentUrlSchema).min(1).max(10),
  vehicleBrand: z.string().min(1).max(100).trim().optional().nullable(),
  vehicleModel: z.string().min(1).max(100).trim().optional().nullable(),
  vehicleType: z.nativeEnum(VEHICLE_TYPE).optional(),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(DRIVER_STATUS),
  reason: z.string().max(500).trim().optional().nullable(),
});

const updateAvailabilitySchema = z.object({
  availabilityStatus: z.nativeEnum(DRIVER_AVAILABILITY_STATUS),
});

const updateLocationSchema = z.object({
  latitude: z.union([z.number(), z.string().transform(Number)]).refine((val) => !Number.isNaN(val)),
  longitude: z
    .union([z.number(), z.string().transform(Number)])
    .refine((val) => !Number.isNaN(val)),
});

const listDriversSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  search: z.string().optional(),
  status: z.nativeEnum(DRIVER_STATUS).optional(),
  availabilityStatus: z.nativeEnum(DRIVER_AVAILABILITY_STATUS).optional(),
  vehicleType: z.nativeEnum(VEHICLE_TYPE).optional(),
  governorateId: z.string().uuid().optional(),
  minRating: z.string().transform(Number).pipe(z.number().min(0).max(5)).optional(),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'fullName', 'rating', 'totalDeliveries', 'status'])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

module.exports = {
  registerDriverSchema,
  loginDriverSchema,
  updateProfileSchema,
  uploadDocumentsSchema,
  uploadVehicleSchema,
  updateStatusSchema,
  updateAvailabilitySchema,
  updateLocationSchema,
  listDriversSchema,
};
