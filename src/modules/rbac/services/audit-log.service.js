/**
 * Audit Log Service
 * Handles audit log operations
 */

const auditLogRepository = require('../repositories/audit-log.repository');
const logger = require('../../../utils/logger');

class AuditLogService {
  /**
   * Create an audit log entry.
   * Kept as the primary method used across modules (business, booking, etc.).
   */
  async create({ userId, action, module, ipAddress, userAgent, payload }) {
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
      // Audit logging must never break the main business flow
      logger.error('Failed to create audit log:', error);
      return null;
    }
  }

  /**
   * Alias for create() used by RBAC modules.
   */
  async logAction(entry) {
    return this.create(entry);
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
