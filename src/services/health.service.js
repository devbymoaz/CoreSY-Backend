/**
 * Health check service.
 * Provides application health status for monitoring and load balancers.
 */

const config = require('../config');
const { SUCCESS_MESSAGES } = require('../constants');

class HealthService {
  /**
   * Get application health status.
   * @returns {Promise<Object>} Health status payload
   */
  async getHealthStatus() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.env,
      appName: config.appName,
      version: config.swagger.version,
      message: SUCCESS_MESSAGES.HEALTH_CHECK,
    };
  }
}

module.exports = new HealthService();
