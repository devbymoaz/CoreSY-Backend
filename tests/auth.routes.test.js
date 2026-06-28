/**
 * Authentication route integration tests.
 * Tests HTTP layer validation and route availability without database.
 */

const request = require('supertest');
const app = require('../src/app');

describe('Auth Routes - Validation', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should return 422 for invalid registration payload', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'invalid' })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return 422 for missing credentials', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({}).expect(422);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/verify-email', () => {
    it('should return 422 for missing otp', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ email: 'test@example.com' })
        .expect(422);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    it('should return 401 without authentication token', async () => {
      const response = await request(app).get('/api/v1/auth/profile').expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    it('should return 401 without authentication token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .send({
          currentPassword: 'OldPass1!',
          newPassword: 'NewPass1!',
          confirmPassword: 'NewPass1!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});

describe('Auth Swagger Documentation', () => {
  it('should include auth endpoints in OpenAPI spec', async () => {
    const response = await request(app).get('/api-docs.json').expect(200);

    const paths = Object.keys(response.body.paths || {});
    const authPaths = paths.filter((p) => p.startsWith('/auth'));

    expect(authPaths.length).toBeGreaterThanOrEqual(10);
    expect(authPaths).toContain('/auth/register');
    expect(authPaths).toContain('/auth/login');
    expect(authPaths).toContain('/auth/profile');
  });
});
