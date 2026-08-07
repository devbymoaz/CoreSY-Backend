# CoreSY Backend - Swagger API Report

## 📋 Executive Summary
The CoreSY Backend API is a production-ready Node.js/Express backend providing user authentication and management system. This document provides a complete overview of the API using Swagger/OpenAPI 3.0 documentation.

---

## 📊 API Overview

### Basic Information
- **API Title**: CoreSY API
- **Version**: 1.0.0
- **Description**: CoreSY Enterprise Backend API Documentation
- **License**: MIT
- **Contact**: support@coresy.io

### Base URLs
- **Production**: `http://YOUR_SERVER_IP:3000/api/v1`
- **Development**: `http://localhost:3000/api/v1`

---

## 📖 Swagger UI Access
**Live Swagger UI**: `http://YOUR_SERVER_IP:3000/api-docs`
**Swagger JSON**: `http://YOUR_SERVER_IP:3000/api-docs.json`

---

## 🏷️ API Tags
All endpoints are organized into the following tags:

| Tag | Description |
|-----|-------------|
| **Health** | Health check endpoints to verify API status |
| **Debug** | Debug and diagnostic endpoints |
| **Governorates** | Syrian governorates list |
| **Auth** | User registration, login, and authentication |
| **Users** | User profile management |

---

## 📡 Endpoint Inventory

### 1. Health & Debug Endpoints
| Method | Path | Summary | Auth? |
|--------|------|---------|-------|
| GET | `/health` | Check API health | ❌ No |
| GET | `/debug` | Debug info (no secrets) | ❌ No |

### 2. Governorates Endpoints
| Method | Path | Summary | Auth? |
|--------|------|---------|-------|
| GET | `/governorates` | Get all governorates | ❌ No |

### 3. Authentication Endpoints
| Method | Path | Summary | Auth? |
|--------|------|---------|-------|
| POST | `/auth/register` | Register new user | ❌ No |
| POST | `/auth/verify-email` | Verify email with OTP | ❌ No |
| POST | `/auth/resend-verification` | Resend OTP | ❌ No |
| POST | `/auth/login` | User login | ❌ No |
| POST | `/auth/refresh-token` | Refresh access token | ❌ No |
| POST | `/auth/logout` | User logout | ✅ Yes |
| POST | `/auth/forgot-password` | Send password reset OTP | ❌ No |
| POST | `/auth/reset-password` | Reset password with OTP | ❌ No |
| POST | `/auth/change-password` | Change password | ✅ Yes |
| GET | `/auth/profile` | Get user profile | ✅ Yes |
| PUT | `/auth/profile` | Update user profile | ✅ Yes |

---

## 🔐 Authentication & Security
### JWT Bearer Authentication
- **Type**: HTTP Bearer (JWT)
- **Bearer Format**: JWT
- **Access Token Expiry**: 7 days
- **Refresh Token Expiry**: 30 days

### How to Authenticate in Swagger UI
1. Open Swagger UI: `http://YOUR_SERVER_IP:3000/api-docs`
2. Click the **Authorize** button at the top right
3. Enter your JWT token (without "Bearer " prefix)
4. Click **Authorize**
5. Now you can test authenticated endpoints!

---

## 📊 Data Schemas

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* ... */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email"
    }
  ]
}
```

### Governorate Schema
```json
{
  "id": "static-aleppo",
  "name": "Aleppo",
  "nameAr": "حلب",
  "code": "AL"
}
```

### User Schema
```json
{
  "id": "uuid",
  "passId": "AL-000001",
  "fullName": "Ahmad Al-Hassan",
  "email": "ahmad@example.com",
  "phoneNumber": "+963912345678",
  "status": "PENDING_VERIFICATION"
}
```

---

## ⚠️ Common HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success! |
| 201 | Created (new resource) |
| 400 | Bad Request (validation errors) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (not allowed) |
| 404 | Not Found |
| 409 | Conflict (already exists) |
| 429 | Too Many Requests (rate limit) |
| 500 | Internal Server Error |

---

## 🎯 Quick Start Guide for Swagger
1. **Open Swagger UI**: `http://YOUR_SERVER_IP:3000/api-docs`
2. **Select Server**: Choose "Production server" from the servers dropdown (uses `API_BASE_URL` from `.env`)
3. **Try /health**: First test the health endpoint to confirm API is running
4. **Get Governorates**: Use `/governorates` to get valid governorate IDs
5. **Register**: Try registering a test user with one of the static governorate IDs
6. **Check Logs**: OTP codes are logged in the server console (PM2: `pm2 logs coresy-api`)
7. **Login**: Use your test user credentials to login and get tokens
8. **Authorize**: Click "Authorize" and paste your access token
9. **Test Authenticated Endpoints**: Now you can test all endpoints!

---

## 📚 Additional Documentation
- **Frontend Developer Guide**: `FRONTEND_DEVELOPER_GUIDE.md
- **GitHub Repo: Your repository
- **Swagger UI**: `http://YOUR_SERVER_IP:3000/api-docs

---

## 🚀 Deployment Details
- **Platform**: AWS EC2 (PM2)
- **Database**: PostgreSQL
- **Cache**: Redis (optional, with in-memory fallback)
- **Framework**: Express.js
- **ORM**: Prisma
- **Node Version**: 22+

---

## 📝 Version History

### Version 1.0.0 (Current)
- ✅ Initial release
- ✅ User registration and authentication
- ✅ Email verification via OTP
- ✅ Password reset functionality
- ✅ Governorates endpoint
- ✅ Demo mode with in-memory storage
- ✅ Comprehensive Swagger/OpenAPI documentation
- ✅ AWS EC2 deployment
