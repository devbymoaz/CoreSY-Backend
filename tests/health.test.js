/**
 * Health endpoint integration tests.
 * Validates API health check response structure and status codes.
 */

const request = require('supertest');
const app = require('../src/app');

describe('Health API', () => {
  describe('GET /api/v1/health', () => {
    it('should return 200 and health status', async () => {
      const response = await request(app).get('/api/v1/health').expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('status', 'healthy');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('environment');
    });
  });

  describe('GET /api/v1/nonexistent', () => {
    it('should return 404 for undefined routes', async () => {
      const response = await request(app).get('/api/v1/nonexistent').expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });
});

describe('Swagger Documentation', () => {
  it('should serve Swagger UI at /api-docs', async () => {
    const response = await request(app).get('/api-docs/').expect(200);
    expect(response.text).toContain('swagger');
  });

  it('should serve OpenAPI JSON spec at /api-docs.json', async () => {
    const response = await request(app).get('/api-docs.json').expect(200);

    expect(response.body).toHaveProperty('openapi', '3.0.0');
    expect(response.body).toHaveProperty('info');
    expect(response.body.info).toHaveProperty('title');
  });
});
