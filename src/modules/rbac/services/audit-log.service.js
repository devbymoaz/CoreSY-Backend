/**
 * Audit Log Service
 * Handles audit log operations
 */

const auditLogRepository = require('../repositories/audit-log.repository');
const logger = require('../../../utils/logger');

class AuditLogService {
  /**
   * Create an audit log entry
   */
  async logAction({ userId, action, module, ipAddress, userAgent, payload }) {
    try {
      return await auditLogRepository.create({
        userId,
        action,
        module,
        ipAddress,
        userAgent,
        payload,
      });
    } catch (error) {
      logger.error('Failed to create audit log:', error);
    }
  }

  /**
   * Get all audit logs with filters
   */
  async getAuditLogs(filters) {
    return auditLogRepository.findAll(filters);
  }

  /**
   * Get an audit log by ID
   */
  async getAuditLogById(id) {
    return auditLogRepository.findById(id);
  }
}

module.exports = new AuditLogService();
