/**
 * SMTP email delivery for authentication OTPs and business owner notices.
 */

const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants');

const OTP_PURPOSES = {
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
  PASSWORD_RESET: 'PASSWORD_RESET',
};

class EmailService {
  constructor() {
    this.transporter = null;
  }

  isConfigured() {
    return Boolean(config.smtp.host && config.smtp.user && config.smtp.pass);
  }

  _getTransporter() {
    if (!this.isConfigured()) {
      return null;
    }

    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass,
        },
      });
    }

    return this.transporter;
  }

  _otpContent(otp, purpose) {
    switch (purpose) {
      case OTP_PURPOSES.EMAIL_VERIFICATION:
        return {
          subject: `${config.appName} email verification code`,
          text: `Your ${config.appName} verification code is ${otp}. It expires in ${Math.floor(config.auth.otpExpirySeconds / 60)} minutes.`,
        };
      case OTP_PURPOSES.PASSWORD_RESET:
        return {
          subject: `${config.appName} password reset code`,
          text: `Your ${config.appName} password reset code is ${otp}. It expires in ${Math.floor(config.auth.passwordResetOtpExpirySeconds / 60)} minutes.`,
        };
      default: {
        const exhaustiveCheck = purpose;
        throw new Error(`Unhandled OTP purpose: ${exhaustiveCheck}`);
      }
    }
  }

  async _sendMail({ to, subject, text, html }) {
    if (!this.isConfigured()) {
      logger.warn(`SMTP is not configured. Email to ${to} skipped. Subject: ${subject}`);
      if (config.env === 'production') {
        throw new AppError(ERROR_MESSAGES.EMAIL_NOT_CONFIGURED, HTTP_STATUS.SERVICE_UNAVAILABLE);
      }
      return false;
    }

    try {
      await this._getTransporter().sendMail({
        from: config.smtp.from,
        to,
        subject,
        text,
        html,
      });
      logger.info(`Email sent to ${to}: ${subject}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send email to ${to}:`, error);
      throw new AppError(ERROR_MESSAGES.EMAIL_SEND_FAILED, HTTP_STATUS.SERVICE_UNAVAILABLE);
    }
  }

  /**
   * Send an OTP email. Logs the OTP when SMTP is not configured in development.
   * @param {string} to
   * @param {string} otp
   * @param {string} purpose
   */
  async sendOtp(to, otp, purpose) {
    const { subject, text } = this._otpContent(otp, purpose);

    if (!this.isConfigured()) {
      logger.warn(
        `SMTP is not configured. OTP for ${to} (${purpose}): ${otp}. Set SMTP_HOST, SMTP_USER, and SMTP_PASS to send email.`,
      );
      if (config.env === 'production') {
        throw new AppError(ERROR_MESSAGES.EMAIL_NOT_CONFIGURED, HTTP_STATUS.SERVICE_UNAVAILABLE);
      }
      return false;
    }

    return this._sendMail({
      to,
      subject,
      text,
      html: `<p>${text}</p><p style="font-size:24px;letter-spacing:4px;"><strong>${otp}</strong></p>`,
    });
  }

  /**
   * Email business owner their CoreSY login details after business creation.
   * @param {Object} params
   */
  async sendBusinessOwnerCredentials({
    to,
    ownerName,
    businessName,
    loginEmail,
    password,
    isNewAccount,
    reservationType,
    associatedApps,
  }) {
    const appsLabel = Array.isArray(associatedApps) ? associatedApps.join(', ') : '';
    const reservationLabel =
      reservationType === 'WITH_RESERVATION' ? 'With reservation' : 'Without reservation';

    const subject = `${config.appName}: ${businessName} account ready`;
    const passwordLine = isNewAccount
      ? `Password: ${password}`
      : 'Password: use your existing CoreSY password (contact support if you need a reset).';

    const text = [
      `Hello ${ownerName},`,
      '',
      `Your business "${businessName}" has been registered on ${config.appName}.`,
      `Reservation type: ${reservationLabel}`,
      appsLabel ? `Associated apps: ${appsLabel}` : null,
      '',
      'Login details:',
      `Email: ${loginEmail}`,
      passwordLine,
      '',
      `API login: POST ${config.apiBaseUrl}/auth/login`,
      '',
      `Thank you,`,
      `${config.appName} Team`,
    ]
      .filter((line) => line !== null)
      .join('\n');

    const html = `
      <p>Hello <strong>${ownerName}</strong>,</p>
      <p>Your business <strong>${businessName}</strong> has been registered on ${config.appName}.</p>
      <ul>
        <li><strong>Reservation type:</strong> ${reservationLabel}</li>
        ${appsLabel ? `<li><strong>Associated apps:</strong> ${appsLabel}</li>` : ''}
      </ul>
      <p><strong>Login details</strong></p>
      <ul>
        <li><strong>Email:</strong> ${loginEmail}</li>
        <li><strong>${isNewAccount ? 'Password' : 'Password note'}:</strong> ${
          isNewAccount
            ? password
            : 'Use your existing CoreSY password (contact support if you need a reset).'
        }</li>
      </ul>
      <p>You can sign in with <code>POST ${config.apiBaseUrl}/auth/login</code>.</p>
      <p>Thank you,<br/>${config.appName} Team</p>
    `;

    if (!this.isConfigured()) {
      logger.warn(
        `SMTP is not configured. Business owner credentials for ${to}: email=${loginEmail}, newAccount=${isNewAccount}${
          isNewAccount ? `, password=${password}` : ''
        }`,
      );
      if (config.env === 'production') {
        throw new AppError(ERROR_MESSAGES.EMAIL_NOT_CONFIGURED, HTTP_STATUS.SERVICE_UNAVAILABLE);
      }
      return false;
    }

    return this._sendMail({ to, subject, text, html });
  }
}

module.exports = new EmailService();
module.exports.OTP_PURPOSES = OTP_PURPOSES;
