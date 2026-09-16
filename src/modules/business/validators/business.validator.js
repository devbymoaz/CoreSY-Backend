const { z } = require('zod');
const {
  BUSINESS_TYPE,
  BUSINESS_STATUS,
  RESERVATION_TYPE,
  ASSOCIATED_APP,
} = require('../../../constants');
const { getPasswordStrengthError } = require('../../../utils/passwordStrength');

/**
 * Accepts ownerPassword (preferred) or password (Flutter/admin UI alias).
 * Always outputs a single ownerPassword field for the service layer.
 */
const withOwnerPasswordAlias = (schema) =>
  schema
    .transform((data) => {
      const ownerPassword = data.ownerPassword || data.password || undefined;
      const { password: _password, ...rest } = data;
      return {
        ...rest,
        ownerPassword,
      };
    })
    .superRefine((data, context) => {
      if (data.ownerPassword) {
        const error = getPasswordStrengthError(data.ownerPassword);
        if (error) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: error,
            path: ['ownerPassword'],
          });
        }
      }
    });

/**
 * Normalize reservation + associated app fields for Flutter aliases.
 */
const withBusinessFeatureFields = (schema) =>
  schema.transform((data) => {
    let reservationType = data.reservationType;
    if (!reservationType && typeof data.withReservation === 'boolean') {
      reservationType = data.withReservation
        ? RESERVATION_TYPE.WITH_RESERVATION
        : RESERVATION_TYPE.WITHOUT_RESERVATION;
    }

    const associatedApps = data.associatedApps || data.associatedApplications || data.apps;

    const { withReservation: _withReservation, associatedApplications: _appsAlias, apps: _apps, ...rest } =
      data;

    return {
      ...rest,
      reservationType,
      associatedApps,
    };
  });

const associatedAppsSchema = z
  .array(z.nativeEnum(ASSOCIATED_APP))
  .min(1, 'Select at least one associated application (PASS, GO, CARE)')
  .transform((apps) => [...new Set(apps)]);

const createBusinessSchema = withOwnerPasswordAlias(
  withBusinessFeatureFields(
    z.object({
      name: z.string().min(2).max(255).trim(),
      type: z.nativeEnum(BUSINESS_TYPE),
      reservationType: z.nativeEnum(RESERVATION_TYPE).optional(),
      withReservation: z.boolean().optional(),
      associatedApps: associatedAppsSchema.optional(),
      associatedApplications: associatedAppsSchema.optional(),
      apps: associatedAppsSchema.optional(),
      category: z.string().min(2).max(100).trim(),
      description: z.string().min(10).trim(),
      ownerName: z.string().min(2).max(255).trim(),
      ownerEmail: z.string().email().toLowerCase().trim(),
      ownerPhone: z.string().min(5).max(20).trim(),
      businessEmail: z.string().email().toLowerCase().trim(),
      businessPhone: z.string().min(5).max(20).trim(),
      registrationNumber: z.string().min(2).max(100).trim(),
      taxNumber: z.string().min(2).max(100).optional().nullable(),
      website: z.string().url().optional().nullable(),
      governorateId: z.string().uuid(),
      city: z.string().min(2).max(100).trim(),
      address: z.string().min(5).trim(),
      latitude: z.number().or(z.string().transform(Number)).optional().nullable(),
      longitude: z.number().or(z.string().transform(Number)).optional().nullable(),
      workingHours: z.any().optional().nullable(),
      facebook: z.string().url().optional().nullable(),
      instagram: z.string().url().optional().nullable(),
      whatsApp: z.string().min(5).max(20).optional().nullable(),
      ownerPassword: z.string().max(100).optional(),
      password: z.string().max(100).optional(),
    }),
  ).superRefine((data, context) => {
    if (!data.reservationType) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'reservationType is required (WITH_RESERVATION or WITHOUT_RESERVATION)',
        path: ['reservationType'],
      });
    }
    if (!data.associatedApps || data.associatedApps.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'associatedApps is required (PASS, GO, CARE)',
        path: ['associatedApps'],
      });
    }
  }),
);

const updateBusinessSchema = withOwnerPasswordAlias(
  withBusinessFeatureFields(
    z.object({
      name: z.string().min(2).max(255).trim().optional(),
      type: z.nativeEnum(BUSINESS_TYPE).optional(),
      reservationType: z.nativeEnum(RESERVATION_TYPE).optional(),
      withReservation: z.boolean().optional(),
      associatedApps: associatedAppsSchema.optional(),
      associatedApplications: associatedAppsSchema.optional(),
      apps: associatedAppsSchema.optional(),
      category: z.string().min(2).max(100).trim().optional(),
      description: z.string().min(10).trim().optional(),
      ownerName: z.string().min(2).max(255).trim().optional(),
      ownerEmail: z.string().email().toLowerCase().trim().optional(),
      ownerPhone: z.string().min(5).max(20).trim().optional(),
      businessEmail: z.string().email().toLowerCase().trim().optional(),
      businessPhone: z.string().min(5).max(20).trim().optional(),
      registrationNumber: z.string().min(2).max(100).trim().optional(),
      taxNumber: z.string().min(2).max(100).optional().nullable(),
      website: z.string().url().optional().nullable(),
      governorateId: z.string().uuid().optional(),
      city: z.string().min(2).max(100).trim().optional(),
      address: z.string().min(5).trim().optional(),
      latitude: z.number().or(z.string().transform(Number)).optional().nullable(),
      longitude: z.number().or(z.string().transform(Number)).optional().nullable(),
      workingHours: z.any().optional().nullable(),
      facebook: z.string().url().optional().nullable(),
      instagram: z.string().url().optional().nullable(),
      whatsApp: z.string().min(5).max(20).optional().nullable(),
      ownerPassword: z.string().max(100).optional(),
      password: z.string().max(100).optional(),
    }),
  ),
);

const updateBusinessStatusSchema = z.object({
  status: z.nativeEnum(BUSINESS_STATUS),
});

const listBusinessesSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  search: z.string().optional(),
  type: z.nativeEnum(BUSINESS_TYPE).optional(),
  reservationType: z.nativeEnum(RESERVATION_TYPE).optional(),
  associatedApp: z.nativeEnum(ASSOCIATED_APP).optional(),
  status: z.nativeEnum(BUSINESS_STATUS).optional(),
  governorateId: z.string().uuid().optional(),
  category: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

module.exports = {
  createBusinessSchema,
  updateBusinessSchema,
  updateBusinessStatusSchema,
  listBusinessesSchema,
};
