/**
 * Swagger/OpenAPI 3.0 configuration.
 * Auto-generates API documentation from JSDoc annotations in route files.
 */

const swaggerJsdoc = require('swagger-jsdoc');
const config = require('../config');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: config.swagger.title,
    version: config.swagger.version,
    description: config.swagger.description,
    contact: {
      name: 'CoreSY API Support',
      email: 'support@coresy.io',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: `https://coresy-backend-production.up.railway.app${config.apiPrefix}`,
      description: 'Production server (Railway)',
    },
    {
      url: `http://localhost:${config.port}${config.apiPrefix}`,
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token',
      },
    },
    schemas: {
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Success' },
          data: { type: 'object' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'An error occurred' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'CoreSY API is running' },
          data: {
            type: 'object',
            properties: {
              status: { type: 'string', example: 'healthy' },
              timestamp: { type: 'string', format: 'date-time' },
              uptime: { type: 'number', example: 123.456 },
              environment: { type: 'string', example: 'development' },
            },
          },
        },
      },
      Governorate: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'static-aleppo' },
          name: { type: 'string', example: 'Aleppo' },
          nameAr: { type: 'string', example: 'حلب' },
          code: { type: 'string', example: 'AL' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          passId: { type: 'string', example: 'AL-000001' },
          fullName: { type: 'string', example: 'Ahmad Al-Hassan' },
          email: { type: 'string', example: 'ahmad@example.com' },
          phoneNumber: { type: 'string', example: '+963912345678' },
          status: { type: 'string', example: 'PENDING_VERIFICATION' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['identifier', 'password'],
        properties: {
          identifier: { type: 'string', example: 'ahmad@example.com' },
          password: { type: 'string', example: 'SecurePass1!' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: [
          'fullName',
          'email',
          'phoneNumber',
          'password',
          'confirmPassword',
          'governorateId',
          'acceptTerms',
        ],
        properties: {
          fullName: { type: 'string', example: 'Ahmad Al-Hassan' },
          email: { type: 'string', example: 'ahmad@example.com' },
          phoneNumber: { type: 'string', example: '+963912345678' },
          smartAssistantName: { type: 'string', example: 'CoreAssist' },
          password: { type: 'string', example: 'SecurePass1!' },
          confirmPassword: { type: 'string', example: 'SecurePass1!' },
          governorateId: { type: 'string', example: 'static-aleppo' },
          acceptTerms: { type: 'boolean', example: true },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          expiresIn: { type: 'string', example: '7d' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      Role: {
        type: 'object',
        required: ['name', 'displayName'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'CUSTOM_ROLE' },
          displayName: { type: 'string', example: 'Custom Role' },
          description: { type: 'string', example: 'Role description' },
          priority: { type: 'integer', example: 50 },
          isSystem: { type: 'boolean', example: false },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], example: 'ACTIVE' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Permission: {
        type: 'object',
        required: ['module', 'name', 'slug'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          module: { type: 'string', example: 'Users' },
          name: { type: 'string', example: 'Create User' },
          slug: { type: 'string', example: 'users.create' },
          description: { type: 'string', example: 'Create new users' },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], example: 'ACTIVE' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Admin: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          passId: { type: 'string', example: 'AL-000001' },
          fullName: { type: 'string', example: 'John Doe' },
          email: { type: 'string', example: 'admin@example.com' },
          phoneNumber: { type: 'string', example: '+963912345678' },
          profileImage: { type: 'string', example: 'https://example.com/profile.jpg' },
          role: { $ref: '#/components/schemas/Role' },
          status: {
            type: 'string',
            enum: ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'],
            example: 'ACTIVE',
          },
          lastLogin: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Business: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Business Name' },
          type: { type: 'string', example: 'RESTAURANT' },
          category: { type: 'string', example: 'Food & Beverage' },
          description: { type: 'string', example: 'Business description' },
          ownerName: { type: 'string', example: 'Owner Name' },
          ownerEmail: { type: 'string', example: 'owner@example.com' },
          ownerPhone: { type: 'string', example: '+963912345678' },
          businessEmail: { type: 'string', example: 'business@example.com' },
          businessPhone: { type: 'string', example: '+963987654321' },
          registrationNumber: { type: 'string', example: '123456789' },
          taxNumber: { type: 'string', example: '987654321' },
          website: { type: 'string', example: 'https://example.com' },
          governorate: { $ref: '#/components/schemas/Governorate' },
          city: { type: 'string', example: 'Damascus' },
          address: { type: 'string', example: 'Main Street, 123' },
          latitude: { type: 'number', example: 33.5138 },
          longitude: { type: 'number', example: 36.2765 },
          status: { type: 'string', example: 'PENDING' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Branch: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Main Branch' },
          code: { type: 'string', example: 'REST-001' },
          businessId: { type: 'string', format: 'uuid' },
          business: { $ref: '#/components/schemas/Business' },
          type: { type: 'string', example: 'Restaurant' },
          description: { type: 'string', example: 'Branch description' },
          governorate: { $ref: '#/components/schemas/Governorate' },
          city: { type: 'string', example: 'Damascus' },
          address: { type: 'string', example: 'Main Street, 456' },
          latitude: { type: 'number', example: 33.514 },
          longitude: { type: 'number', example: 36.277 },
          googleMapLink: { type: 'string', example: 'https://maps.google.com' },
          contactEmail: { type: 'string', example: 'branch@example.com' },
          contactPhone: { type: 'string', example: '+963987654321' },
          whatsAppNumber: { type: 'string', example: '+963987654321' },
          workingDays: { type: 'array', items: { type: 'string' } },
          openingTime: { type: 'string', example: '09:00' },
          closingTime: { type: 'string', example: '21:00' },
          emergencyContact: { type: 'string', example: '+963912345678' },
          image: { type: 'string', example: 'https://example.com/branch.jpg' },
          coverImage: { type: 'string', example: 'https://example.com/cover.jpg' },
          status: { type: 'string', example: 'PENDING' },
          isMain: { type: 'boolean', example: false },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  tags: [
    { name: 'Health', description: 'Health check endpoints' },
    { name: 'Debug', description: 'Debug and diagnostic endpoints' },
    { name: 'Governorates', description: 'Syrian governorates endpoints' },
    { name: 'Auth', description: 'Authentication endpoints' },
    { name: 'Roles', description: 'Role management endpoints' },
    { name: 'Permissions', description: 'Permission management endpoints' },
    { name: 'User Roles', description: 'User role assignment endpoints' },
    { name: 'Users', description: 'User management endpoints' },
    { name: 'Admins', description: 'Admin management endpoints' },
    { name: 'Businesses', description: 'Business management endpoints' },
    { name: 'Branches', description: 'Branch management endpoints' },
  ],
};

const options = {
  swaggerDefinition,
  apis: [
    './src/routes/**/*.js',
    './src/docs/**/*.js',
    './src/modules/rbac/routes/**/*.js',
    './src/modules/admin/routes/**/*.js',
    './src/modules/business/routes/**/*.js',
    './src/modules/branch/routes/**/*.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
