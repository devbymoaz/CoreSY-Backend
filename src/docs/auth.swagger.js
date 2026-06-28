/**
 * Authentication Swagger schema definitions.
 * Reusable OpenAPI components for auth endpoints.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - fullName
 *         - email
 *         - phoneNumber
 *         - password
 *         - confirmPassword
 *         - governorateId
 *         - acceptTerms
 *       properties:
 *         fullName:
 *           type: string
 *           example: Ahmad Al-Hassan
 *         email:
 *           type: string
 *           format: email
 *           example: ahmad@example.com
 *         phoneNumber:
 *           type: string
 *           example: "+963912345678"
 *         smartAssistantName:
 *           type: string
 *           example: CoreAssist
 *         password:
 *           type: string
 *           format: password
 *           example: "SecurePass1!"
 *         confirmPassword:
 *           type: string
 *           format: password
 *           example: "SecurePass1!"
 *         governorateId:
 *           type: string
 *           format: uuid
 *           example: "uuid-of-governorate"
 *         acceptTerms:
 *           type: boolean
 *           example: true
 *     LoginRequest:
 *       type: object
 *       required:
 *         - identifier
 *         - password
 *       properties:
 *         identifier:
 *           type: string
 *           description: Email address or phone number
 *           example: ahmad@example.com
 *         password:
 *           type: string
 *           format: password
 *           example: "SecurePass1!"
 *     VerifyEmailRequest:
 *       type: object
 *       required:
 *         - email
 *         - otp
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: ahmad@example.com
 *         otp:
 *           type: string
 *           example: "123456"
 *     ResendVerificationRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: ahmad@example.com
 *     RefreshTokenRequest:
 *       type: object
 *       required:
 *         - refreshToken
 *       properties:
 *         refreshToken:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     ForgotPasswordRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: ahmad@example.com
 *     ResetPasswordRequest:
 *       type: object
 *       required:
 *         - email
 *         - otp
 *         - newPassword
 *         - confirmPassword
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         otp:
 *           type: string
 *           example: "123456"
 *         newPassword:
 *           type: string
 *           format: password
 *         confirmPassword:
 *           type: string
 *           format: password
 *     ChangePasswordRequest:
 *       type: object
 *       required:
 *         - currentPassword
 *         - newPassword
 *         - confirmPassword
 *       properties:
 *         currentPassword:
 *           type: string
 *           format: password
 *         newPassword:
 *           type: string
 *           format: password
 *         confirmPassword:
 *           type: string
 *           format: password
 *     UpdateProfileRequest:
 *       type: object
 *       properties:
 *         fullName:
 *           type: string
 *           example: Ahmad Al-Hassan
 *         smartAssistantName:
 *           type: string
 *           example: CoreAssist
 *         phoneNumber:
 *           type: string
 *           example: "+963912345678"
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         passId:
 *           type: string
 *           example: DM-000001
 *         fullName:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         phoneNumber:
 *           type: string
 *         smartAssistantName:
 *           type: string
 *         emailVerified:
 *           type: boolean
 *         phoneVerified:
 *           type: boolean
 *         status:
 *           type: string
 *           enum: [PENDING_VERIFICATION, ACTIVE, SUSPENDED, DEACTIVATED]
 *         subscription:
 *           type: string
 *           enum: [FREE, PREMIUM, ENTERPRISE]
 *         governorate:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             name:
 *               type: string
 *             code:
 *               type: string
 *         role:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             name:
 *               type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     AuthTokens:
 *       type: object
 *       properties:
 *         accessToken:
 *           type: string
 *         refreshToken:
 *           type: string
 *         expiresIn:
 *           type: string
 *           example: 7d
 *         user:
 *           $ref: '#/components/schemas/User'
 */

module.exports = {};
