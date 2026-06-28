/**
 * Authentication validator unit tests.
 * Tests validation logic without database dependencies.
 */

const {
  validateRegister,
  validateLogin,
  validateVerifyEmail,
  validateChangePassword,
} = require('../src/validators/auth.validator');

describe('Auth Validators', () => {
  describe('validateRegister', () => {
    const validPayload = {
      fullName: 'Ahmad Al-Hassan',
      email: 'ahmad@example.com',
      phoneNumber: '+963912345678',
      smartAssistantName: 'CoreAssist',
      password: 'SecurePass1!',
      confirmPassword: 'SecurePass1!',
      governorateId: '550e8400-e29b-41d4-a716-446655440000',
      acceptTerms: true,
    };

    it('should pass with valid registration data', () => {
      const result = validateRegister(validPayload);
      expect(result.error).toBeNull();
      expect(result.value.email).toBe('ahmad@example.com');
      expect(result.value.phoneNumber).toBe('+963912345678');
    });

    it('should fail when passwords do not match', () => {
      const result = validateRegister({ ...validPayload, confirmPassword: 'Different1!' });
      expect(result.error).not.toBeNull();
    });

    it('should fail with weak password', () => {
      const result = validateRegister({
        ...validPayload,
        password: 'weak',
        confirmPassword: 'weak',
      });
      expect(result.error).not.toBeNull();
    });

    it('should fail when terms not accepted', () => {
      const result = validateRegister({ ...validPayload, acceptTerms: false });
      expect(result.error).not.toBeNull();
    });

    it('should fail with invalid email', () => {
      const result = validateRegister({ ...validPayload, email: 'not-an-email' });
      expect(result.error).not.toBeNull();
    });
  });

  describe('validateLogin', () => {
    it('should pass with email identifier', () => {
      const result = validateLogin({
        identifier: 'ahmad@example.com',
        password: 'SecurePass1!',
      });
      expect(result.error).toBeNull();
      expect(result.value.identifier).toBe('ahmad@example.com');
    });

    it('should pass with phone identifier', () => {
      const result = validateLogin({
        identifier: '0912345678',
        password: 'SecurePass1!',
      });
      expect(result.error).toBeNull();
      expect(result.value.identifier).toBe('+963912345678');
    });

    it('should fail without password', () => {
      const result = validateLogin({ identifier: 'ahmad@example.com' });
      expect(result.error).not.toBeNull();
    });
  });

  describe('validateVerifyEmail', () => {
    it('should pass with valid email and otp', () => {
      const result = validateVerifyEmail({ email: 'ahmad@example.com', otp: '123456' });
      expect(result.error).toBeNull();
    });

    it('should fail without otp', () => {
      const result = validateVerifyEmail({ email: 'ahmad@example.com' });
      expect(result.error).not.toBeNull();
    });
  });

  describe('validateChangePassword', () => {
    it('should pass with valid passwords', () => {
      const result = validateChangePassword({
        currentPassword: 'OldPass1!',
        newPassword: 'NewPass1!',
        confirmPassword: 'NewPass1!',
      });
      expect(result.error).toBeNull();
    });

    it('should fail when new passwords do not match', () => {
      const result = validateChangePassword({
        currentPassword: 'OldPass1!',
        newPassword: 'NewPass1!',
        confirmPassword: 'Different1!',
      });
      expect(result.error).not.toBeNull();
    });
  });
});
