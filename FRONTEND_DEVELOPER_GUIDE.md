# CoreSY Backend - Frontend Developer Guide

## 📚 Table of Contents
1. [Base URL](#base-url)
2. [Swagger Documentation](#swagger-documentation)
3. [Environment Variables & Configuration](#environment-variables--configuration)
4. [Authentication Flow](#authentication-flow)
5. [API Endpoints Reference](#api-endpoints-reference)
6. [Error Handling](#error-handling)
7. [Testing Credentials & Demo Mode](#testing-credentials--demo-mode)
8. [Changelog](#changelog)

---

## 🌐 Base URL
**Production**: `https://coresy-backend-production.up.railway.app/api/v1`
**Local Development**: `http://localhost:3000/api/v1`

---

## 📖 Swagger Documentation
**Live Swagger UI**: `https://coresy-backend-production.up.railway.app/api-docs`

This is your interactive documentation! You can:
- Test all endpoints directly in the browser
- See request/response schemas
- View example payloads
- See error codes and descriptions

---

## 🔧 Environment Variables & Configuration
### Frontend Configuration
```javascript
// Example config for frontend
const API_CONFIG = {
  baseUrl: process.env.REACT_APP_API_URL || 'https://coresy-backend-production.up.railway.app/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};
```

---

## 🔐 Authentication Flow
### 1. User Registration
```javascript
POST /auth/register
Content-Type: application/json

{
  "fullName": "Ahmad Al-Hassan",
  "email": "ahmad@example.com",
  "phoneNumber": "+963912345678",
  "smartAssistantName": "CoreAssist",
  "password": "SecurePass1!",
  "confirmPassword": "SecurePass1!",
  "governorateId": "static-aleppo",
  "acceptTerms": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Registration successful (demo mode - no database!)",
  "data": {
    "message": "Registration successful (demo mode - no database!)",
    "user": { ... },
    "requiresEmailVerification": true,
    "demoMode": true
  }
}
```

### 2. Email Verification (OTP)
After registration, you'll receive an OTP (logged in server logs for demo).

```javascript
POST /auth/verify-email
Content-Type: application/json

{
  "email": "ahmad@example.com",
  "otp": "123456"
}
```

### 3. User Login
```javascript
POST /auth/login
Content-Type: application/json

{
  "identifier": "ahmad@example.com",
  "password": "SecurePass1!"
}
```

**Response (with JWT tokens)**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": "7d",
    "user": { ... }
  }
}
```

### 4. Using JWT for Authenticated Endpoints
Include the access token in your headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### 5. Refreshing Tokens
When the access token expires, use the refresh token to get a new one:
```javascript
POST /auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 6. Logout
```javascript
POST /auth/logout
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## 📡 API Endpoints Reference
### Health Check
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Check if the API is running | ❌ No |
| GET | `/debug` | Get debug info (no secrets!) | ❌ No |

### Governorates
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/governorates` | Get list of all Syrian governorates | ❌ No |

### Authentication
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register a new user | ❌ No |
| POST | `/auth/verify-email` | Verify email with OTP | ❌ No |
| POST | `/auth/resend-verification` | Resend OTP | ❌ No |
| POST | `/auth/login` | User login | ❌ No |
| POST | `/auth/refresh-token` | Refresh access token | ❌ No |
| POST | `/auth/logout` | User logout | ✅ Yes |
| POST | `/auth/forgot-password` | Send password reset OTP | ❌ No |
| POST | `/auth/reset-password` | Reset password with OTP | ❌ No |
| POST | `/auth/change-password` | Change password (authenticated) | ✅ Yes |
| GET | `/auth/profile` | Get user profile | ✅ Yes |
| PUT | `/auth/profile` | Update user profile | ✅ Yes |

---

## ⚠️ Error Handling
### Error Response Format
```json
{
  "success": false,
  "message": "Error message here",
  "statusCode": 400,
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Common HTTP Status Codes
| Code | Description |
|------|-------------|
| 200 | Success! |
| 201 | Created (registration, etc.) |
| 400 | Bad Request (validation errors) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (email not verified, account suspended) |
| 404 | Not Found |
| 409 | Conflict (email/phone already exists) |
| 429 | Too Many Requests (rate limit) |
| 500 | Internal Server Error |

---

## 🧪 Testing Credentials & Demo Mode
### Demo Mode
The app is currently running in **demo mode** which means:
- No database required (in-memory storage)
- OTP codes are logged in the server console
- Governorates use static IDs

### Demo Governorate IDs
Use these for testing registration:
- `static-damascus` - Damascus
- `static-aleppo` - Aleppo
- `static-homs` - Homs
- `static-hama` - Hama
- `static-latakia` - Latakia
- `static-tartus` - Tartus
- `static-idlib` - Idlib
- `static-deir-ez-zor` - Deir ez-Zor
- `static-raqqa` - Raqqa
- `static-hasakah` - Hasakah
- `static-daraa` - Daraa
- `static-quneitra` - Quneitra
- `static-suwayda` - Suwayda
- `static-damascus-countryside` - Damascus Countryside

---

## 📝 Changelog
### v1.0.0 (Current)
- ✅ Initial production release
- ✅ User registration & authentication
- ✅ Email verification (OTP)
- ✅ Password reset
- ✅ Governorates endpoint
- ✅ Demo mode with in-memory storage
- ✅ Swagger documentation
- ✅ Railway deployment

---

## 📞 Support
For any issues:
1. Check Swagger first: `https://coresy-backend-production.up.railway.app/api-docs`
2. Check debug endpoint: `https://coresy-backend-production.up.railway.app/api/v1/debug`
3. Look at server logs in Railway

---

## 🎯 Quick Start for Frontend Developers
1. Read Swagger docs: `https://coresy-backend-production.up.railway.app/api-docs`
2. Get governorates list: `GET /api/v1/governorates`
3. Register a test user: `POST /api/v1/auth/register`
4. Verify email with OTP (check server logs!)
5. Login and get tokens
6. Start building!
