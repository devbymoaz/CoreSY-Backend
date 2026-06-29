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
        required: ['fullName', 'email', 'phoneNumber', 'password', 'confirmPassword', 'governorateId', 'acceptTerms'],
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
          user: { '$ref': '#/components/schemas/User' },
        },
      },
    },
  },
  tags: [
    { name: 'Health', description: 'Health check endpoints' },
    { name: 'Debug', description: 'Debug and diagnostic endpoints' },
    { name: 'Governorates', description: 'Syrian governorates endpoints' },
    { name: 'Auth', description: 'Authentication endpoints' },
    { name: 'Users', description: 'User management endpoints' },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./src/routes/**/*.js', './src/docs/**/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
