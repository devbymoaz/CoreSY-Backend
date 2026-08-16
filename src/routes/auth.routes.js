/**
 * Authentication routes.
 * Defines all auth API endpoints with Swagger documentation.
 */

const express = require('express');
const authController = require('../controllers/auth.controller');
const authenticate = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  validateRegister,
  validateVerifyEmail,
  validateResendVerification,
  validateLogin,
  validateRefreshToken,
  validateLogout,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
  validateUpdateProfile,
} = require('../validators/auth.validator');

const router = express.Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user account
 *     description: Creates a new CoreSY account shared across Pass, Care, and Go. Requires email verification.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *           example:
 *             fullName: Ahmad Al-Hassan
 *             email: ahmad@example.com
 *             phoneNumber: "+963912345678"
 *             smartAssistantName: CoreAssist
 *             password: "SecurePass1!"
 *             confirmPassword: "SecurePass1!"
 *             governorateId: "uuid-of-governorate"
 *             acceptTerms: true
 *     responses:
 *       201:
 *         description: Registration successful, email verification required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Registration successful. Please verify your email.
 *                 data:
 *                   type: object
 *                   properties:
 *                     requiresEmailVerification:
 *                       type: boolean
 *                       example: true
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       409:
 *         $ref: '#/components/responses/ValidationError'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post('/register', validate(validateRegister), authController.register);

/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     summary: Verify email address
 *     description: Verifies user email using OTP sent during registration
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyEmailRequest'
 *           example:
 *             email: ahmad@example.com
 *             otp: "123456"
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid or expired OTP
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post('/verify-email', validate(validateVerifyEmail), authController.verifyEmail);

/**
 * @swagger
 * /auth/resend-email-verification:
 *   post:
 *     summary: Resend email verification OTP
 *     description: Sends a new verification code to the user's email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: ahmad@example.com
 *           example:
 *             email: ahmad@example.com
 *     responses:
 *       200:
 *         description: Verification code sent
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  '/resend-email-verification',
  validate(validateResendVerification),
  authController.resendEmailVerification,
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate using email or phone number and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             identifier: ahmad@example.com
 *             password: "SecurePass1!"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/AuthTokens'
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Email not verified or account not active
 */
router.post('/login', validate(validateLogin), authController.login);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     description: Exchange a valid refresh token for a new access/refresh token pair (rotation)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *           example:
 *             refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Tokens refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AuthTokens'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/refresh-token', validate(validateRefreshToken), authController.refreshToken);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: User logout
 *     description: Revokes the provided refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *           example:
 *             refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', validate(validateLogout), authController.logout);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     description: Sends a password reset OTP to the user's email if account exists
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: ahmad@example.com
 *           example:
 *             email: ahmad@example.com
 *     responses:
 *       200:
 *         description: Reset code sent if email exists
 */
router.post('/forgot-password', validate(validateForgotPassword), authController.forgotPassword);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password
 *     description: Reset password using OTP received via email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp, newPassword, confirmPassword]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: ahmad@example.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: "SecurePass1!"
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 example: "SecurePass1!"
 *           example:
 *             email: ahmad@example.com
 *             otp: "123456"
 *             newPassword: "SecurePass1!"
 *             confirmPassword: "SecurePass1!"
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired OTP
 */
router.post('/reset-password', validate(validateResetPassword), authController.resetPassword);

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Change password
 *     description: Change password for authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword, confirmPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 example: "SecurePass1!"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: "SecurePass1!"
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 example: "SecurePass1!"
 *           example:
 *             currentPassword: "SecurePass1!"
 *             newPassword: "SecurePass1!"
 *             confirmPassword: "SecurePass1!"
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Current password incorrect
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/change-password',
  authenticate,
  validate(validateChangePassword),
  authController.changePassword,
);

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Get user profile
 *     description: Returns the authenticated user's profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/profile', authenticate, authController.getProfile);

/**
 * @swagger
 * /auth/profile:
 *   patch:
 *     summary: Update user profile
 *     description: Update authenticated user's profile fields
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *           example:
 *             fullName: Ahmad Al-Hassan
 *             smartAssistantName: CoreAssist
 *             phoneNumber: "+963912345678"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       409:
 *         description: Phone number already in use
 */
router.patch(
  '/profile',
  authenticate,
  validate(validateUpdateProfile),
  authController.updateProfile,
);

module.exports = router;
