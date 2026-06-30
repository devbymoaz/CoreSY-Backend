# CoreSY Backend Architecture & Development Plan

## 📋 Table of Contents
1. [Overview](#overview)
2. [Phase 1 (Completed)](#phase-1-completed)
3. [Phase 2: RBAC (Roles & Permissions)](#phase-2-rbac-roles--permissions)
4. [Phase 3: Admin Management](#phase-3-admin-management)
5. [Phase 4: Business (Establishment) Management](#phase-4-business-establishment-management)
6. [Phase 5: Business Branches](#phase-5-business-branches)
7. [Phase 6: Business Services](#phase-6-business-services)
8. [Phase 7: Cashier Management](#phase-7-cashier-management)
9. [Phase 8: Reservations & Appointment Slots](#phase-8-reservations--appointment-slots)
10. [Phase 9: Bookings](#phase-9-bookings)
11. [Phase 10: QR System](#phase-10-qr-system)
12. [Phase 11: CoreSY Go Products](#phase-11-coresy-go-products)
13. [Phase 12: Orders](#phase-12-orders)
14. [Phase 13: Driver](#phase-13-driver)
15. [Phase 14: Payments](#phase-14-payments)
16. [Phase 15: Wallet](#phase-15-wallet)
17. [Phase 16: Points](#phase-16-points)
18. [Phase 17: Ratings](#phase-17-ratings)
19. [Phase 18: Notifications](#phase-18-notifications)
20. [Phase 19: Analytics & Reports](#phase-19-analytics--reports)
21. [Phase 20: Admin Dashboard APIs](#phase-20-admin-dashboard-apis)
22. [Tech Stack](#tech-stack)
23. [Database Design Principles](#database-design-principles)
24. [API Design Guidelines](#api-design-guidelines)

---

## 🎯 Overview
CoreSY is a comprehensive multi-module platform covering:
- **CoreSY Pass**: User authentication & identity
- **CoreSY Care**: Health clinics & medical services
- **CoreSY Go**: E-commerce & delivery services
- **CoreSY Eat**: Restaurants & reservations

---

## ✅ Phase 1 (Completed)
- ✅ Project Setup & Deployment
- ✅ Authentication (JWT-based)
- ✅ Swagger/OpenAPI Documentation
- ✅ User Profile Management
- ✅ Health Check Endpoint
- ✅ Governorates (Syrian governorates)

---

## 🔜 Phase 2: RBAC (Roles & Permissions)
### Goals
- Implement fine-grained access control
- Define standard roles (User, Business Owner, Branch Manager, Cashier, Driver, Admin, Super Admin)
- Create permission system
- Implement role-based access checks

### Tasks
1. **Database Schema**:
   - `roles` table (enhanced)
   - `permissions` table
   - `role_permissions` pivot table
   - `user_roles` pivot table

2. **API Endpoints**:
   - `GET /api/v1/roles` - List all roles
   - `GET /api/v1/roles/:id` - Get specific role
   - `POST /api/v1/roles` - Create role (admin only)
   - `PUT /api/v1/roles/:id` - Update role (admin only)
   - `DELETE /api/v1/roles/:id` - Delete role (admin only)
   - `GET /api/v1/permissions` - List all permissions
   - `POST /api/v1/users/:id/roles` - Assign role to user
   - `DELETE /api/v1/users/:id/roles/:roleId` - Remove role from user

3. **Middleware**:
   - `rbacMiddleware()` - Check permissions for requests

---

## 🔜 Phase 3: Admin Management
### Goals
- Admin user management
- Admin dashboard foundation
- Audit logging

### Tasks
1. **Database Schema**:
   - `admin_profiles` table
   - `audit_logs` table

2. **API Endpoints**:
   - `GET /api/v1/admin/users` - List all users (paginated)
   - `GET /api/v1/admin/users/:id` - Get user details
   - `PUT /api/v1/admin/users/:id` - Update user (activate/suspend)
   - `DELETE /api/v1/admin/users/:id` - Soft delete user
   - `GET /api/v1/admin/audit-logs` - Get audit logs

---

## 🔜 Phase 4: Business (Establishment) Management
### Goals
- Create and manage businesses (restaurants, clinics, beauty salons, etc.)
- Business categories and types
- Business profiles and settings

### Tasks
1. **Database Schema**:
   - `business_categories` table
   - `business_types` table
   - `businesses` table
   - `business_owners` pivot table

2. **API Endpoints**:
   - `GET /api/v1/business-categories` - List categories
   - `GET /api/v1/business-types` - List business types
   - `POST /api/v1/businesses` - Create business
   - `GET /api/v1/businesses` - List businesses (filter, search, paginate)
   - `GET /api/v1/businesses/:id` - Get business details
   - `PUT /api/v1/businesses/:id` - Update business
   - `DELETE /api/v1/businesses/:id` - Soft delete business
   - `GET /api/v1/my-businesses` - Get user's businesses

---

## 🔜 Phase 5: Business Branches
### Goals
- Manage multiple branches per business
- Branch locations and working hours
- Branch staff management

### Tasks
1. **Database Schema**:
   - `branches` table
   - `branch_working_hours` table
   - `branch_staff` pivot table

2. **API Endpoints**:
   - `GET /api/v1/businesses/:businessId/branches` - List branches
   - `POST /api/v1/businesses/:businessId/branches` - Create branch
   - `GET /api/v1/branches/:id` - Get branch details
   - `PUT /api/v1/branches/:id` - Update branch
   - `DELETE /api/v1/branches/:id` - Soft delete branch
   - `GET /api/v1/branches/:id/working-hours` - Get working hours
   - `PUT /api/v1/branches/:id/working-hours` - Update working hours

---

## 🔜 Phase 6: Business Services (Restaurants, Clinics, Beauty etc.)
### Goals
- Define services offered by businesses
- Service categories and pricing
- Service duration and availability

### Tasks
1. **Database Schema**:
   - `service_categories` table
   - `services` table
   - `service_pricing` table

2. **API Endpoints**:
   - `GET /api/v1/service-categories` - List service categories
   - `POST /api/v1/branches/:branchId/services` - Add service to branch
   - `GET /api/v1/branches/:branchId/services` - List branch services
   - `GET /api/v1/services/:id` - Get service details
   - `PUT /api/v1/services/:id` - Update service
   - `DELETE /api/v1/services/:id` - Soft delete service

---

## 🔜 Phase 7: Cashier Management
### Goals
- Cashier accounts and access
- Cash register management
- Shift management

### Tasks
1. **Database Schema**:
   - `cashiers` table
   - `cash_registers` table
   - `cashier_shifts` table

2. **API Endpoints**:
   - `POST /api/v1/branches/:branchId/cashiers` - Add cashier
   - `GET /api/v1/branches/:branchId/cashiers` - List cashiers
   - `POST /api/v1/cashiers/:id/shifts` - Start shift
   - `PUT /api/v1/cashiers/:id/shifts/current` - End shift
   - `GET /api/v1/cashiers/:id/shifts` - Get shift history

---

## 🔜 Phase 8: Reservations & Appointment Slots
### Goals
- Manage appointment slots
- Define service availability
- Handle capacity constraints

### Tasks
1. **Database Schema**:
   - `appointment_slots` table
   - `slot_capacities` table
   - `slot_exceptions` table

2. **API Endpoints**:
   - `POST /api/v1/services/:serviceId/slots` - Create slots
   - `GET /api/v1/services/:serviceId/slots` - Get available slots
   - `PUT /api/v1/slots/:id` - Update slot
   - `DELETE /api/v1/slots/:id` - Delete slot
   - `GET /api/v1/branches/:branchId/slots/availability` - Check availability

---

## 🔜 Phase 9: Bookings
### Goals
- Create and manage bookings
- Booking status management
- Booking history

### Tasks
1. **Database Schema**:
   - `bookings` table
   - `booking_status` enum
   - `booking_items` table

2. **API Endpoints**:
   - `POST /api/v1/bookings` - Create booking
   - `GET /api/v1/my-bookings` - Get user bookings
   - `GET /api/v1/bookings/:id` - Get booking details
   - `PUT /api/v1/bookings/:id/status` - Update booking status
   - `DELETE /api/v1/bookings/:id` - Cancel booking
   - `GET /api/v1/branches/:branchId/bookings` - Get branch bookings

---

## 🔜 Phase 10: QR System
### Goals
- Generate QR codes for check-in/check-out
- QR-based verification
- QR code scanning endpoints

### Tasks
1. **Database Schema**:
   - `qr_codes` table
   - `qr_scans` table

2. **API Endpoints**:
   - `POST /api/v1/bookings/:bookingId/qr` - Generate QR for booking
   - `POST /api/v1/qr/scan` - Scan QR code (check-in)
   - `GET /api/v1/qr/:qrId` - Get QR details

---

## 🔜 Phase 11: CoreSY Go Products
### Goals
- Product catalog management
- Product categories and variants
- Inventory tracking

### Tasks
1. **Database Schema**:
   - `product_categories` table
   - `products` table
   - `product_variants` table
   - `inventory` table

2. **API Endpoints**:
   - `GET /api/v1/product-categories` - List categories
   - `POST /api/v1/branches/:branchId/products` - Add product
   - `GET /api/v1/branches/:branchId/products` - List products
   - `GET /api/v1/products/:id` - Get product details
   - `PUT /api/v1/products/:id` - Update product
   - `DELETE /api/v1/products/:id` - Soft delete product

---

## 🔜 Phase 12: Orders
### Goals
- Order management (CoreSY Go)
- Order status tracking
- Order items and modifications

### Tasks
1. **Database Schema**:
   - `orders` table
   - `order_status` enum
   - `order_items` table
   - `order_modifications` table

2. **API Endpoints**:
   - `POST /api/v1/orders` - Create order
   - `GET /api/v1/my-orders` - Get user orders
   - `GET /api/v1/orders/:id` - Get order details
   - `PUT /api/v1/orders/:id/status` - Update order status
   - `GET /api/v1/branches/:branchId/orders` - Get branch orders

---

## 🔜 Phase 13: Driver
### Goals
- Driver management
- Driver assignment
- Delivery tracking

### Tasks
1. **Database Schema**:
   - `drivers` table
   - `driver_profiles` table
   - `driver_assignments` table
   - `deliveries` table

2. **API Endpoints**:
   - `POST /api/v1/drivers` - Register driver
   - `GET /api/v1/drivers` - List drivers
   - `POST /api/v1/orders/:orderId/assign-driver` - Assign driver
   - `POST /api/v1/deliveries/:id/status` - Update delivery status
   - `GET /api/v1/my-deliveries` - Get driver deliveries

---

## 🔜 Phase 14: Payments
### Goals
- Payment processing integration
- Multiple payment methods
- Payment records and history

### Tasks
1. **Database Schema**:
   - `payments` table
   - `payment_methods` table
   - `payment_transactions` table

2. **API Endpoints**:
   - `POST /api/v1/payments` - Process payment
   - `GET /api/v1/my-payments` - Get user payment history
   - `GET /api/v1/payments/:id` - Get payment details
   - `GET /api/v1/payment-methods` - List payment methods

---

## 🔜 Phase 15: Wallet
### Goals
- User wallet system
- Wallet transactions
- Balance management

### Tasks
1. **Database Schema**:
   - `wallets` table
   - `wallet_transactions` table

2. **API Endpoints**:
   - `GET /api/v1/my-wallet` - Get wallet details
   - `GET /api/v1/my-wallet/transactions` - Get transaction history
   - `POST /api/v1/wallets/:id/deposit` - Deposit to wallet
   - `POST /api/v1/wallets/:id/withdraw` - Withdraw from wallet

---

## 🔜 Phase 16: Points
### Goals
- Loyalty points system
- Points earning and redemption
- Points history

### Tasks
1. **Database Schema**:
   - `points_accounts` table
   - `points_transactions` table
   - `points_rules` table

2. **API Endpoints**:
   - `GET /api/v1/my-points` - Get points balance
   - `GET /api/v1/my-points/transactions` - Get points history
   - `POST /api/v1/points/redeem` - Redeem points
   - `GET /api/v1/points-rules` - Get points rules

---

## 🔜 Phase 17: Ratings
### Goals
- User ratings for businesses
- Review management
- Ratings analytics

### Tasks
1. **Database Schema**:
   - `ratings` table
   - `reviews` table
   - `rating_responses` table

2. **API Endpoints**:
   - `POST /api/v1/businesses/:id/ratings` - Submit rating
   - `GET /api/v1/businesses/:id/ratings` - Get business ratings
   - `GET /api/v1/my-ratings` - Get user ratings
   - `PUT /api/v1/ratings/:id` - Update rating
   - `DELETE /api/v1/ratings/:id` - Delete rating

---

## 🔜 Phase 18: Notifications
### Goals
- Push notifications
- Email notifications
- SMS notifications
- Notification preferences

### Tasks
1. **Database Schema**:
   - `notifications` table
   - `notification_preferences` table
   - `notification_templates` table

2. **API Endpoints**:
   - `GET /api/v1/my-notifications` - Get user notifications
   - `PUT /api/v1/notifications/:id/read` - Mark as read
   - `GET /api/v1/my-notifications/preferences` - Get preferences
   - `PUT /api/v1/my-notifications/preferences` - Update preferences

---

## 🔜 Phase 19: Analytics & Reports
### Goals
- Business analytics
- Sales reports
- User behavior insights

### Tasks
1. **Database Schema**:
   - `analytics_events` table
   - `reports` table

2. **API Endpoints**:
   - `GET /api/v1/analytics/sales` - Get sales analytics
   - `GET /api/v1/analytics/bookings` - Get booking analytics
   - `GET /api/v1/analytics/users` - Get user analytics
   - `GET /api/v1/reports/sales` - Generate sales report
   - `GET /api/v1/reports/bookings` - Generate booking report

---

## 🔜 Phase 20: Admin Dashboard APIs
### Goals
- Comprehensive admin dashboard
- Aggregated analytics
- System health and monitoring
- Configuration management

### Tasks
1. **API Endpoints**:
   - `GET /api/v1/admin/dashboard/summary` - Dashboard summary
   - `GET /api/v1/admin/dashboard/metrics` - Key metrics
   - `GET /api/v1/admin/dashboard/top-businesses` - Top performing businesses
   - `GET /api/v1/admin/dashboard/top-users` - Top users
   - `GET /api/v1/admin/dashboard/revenue` - Revenue analytics
   - `GET /api/v1/admin/system/health` - System health status
   - `PUT /api/v1/admin/system/config` - Update system config

---

## 🛠️ Tech Stack
- **Runtime**: Node.js 22+
- **Framework**: Express.js 5.1+
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Cache**: Redis (optional, with in-memory fallback)
- **Auth**: JWT
- **Documentation**: Swagger/OpenAPI 3.0
- **Logging**: Winston
- **Validation**: Custom validator
- **Deployment**: Railway
- **Package Manager**: npm

---

## 🗃️ Database Design Principles
1. **UUID Primary Keys**: All tables use UUIDs
2. **Soft Deletes**: Use `deleted_at` timestamp instead of hard deletes
3. **Created/Updated Timestamps**: All tables have `created_at` and `updated_at`
4. **Proper Indexes**: Index frequently queried columns
5. **Foreign Key Constraints**: Maintain referential integrity
6. **Enums**: Use enums for status fields
7. **Audit Logging**: Track critical changes

---

## 📡 API Design Guidelines
1. **RESTful Design**: Follow REST principles
2. **JSON API**: Standard JSON request/response format
3. **Pagination**: Use `page` and `limit` for list endpoints
4. **Filtering**: Support query parameters for filtering
5. **Sorting**: Support `sort_by` and `sort_order`
6. **Versioning**: All endpoints under `/api/v1`
7. **Error Handling**: Consistent error response format
8. **Authentication**: JWT Bearer tokens
9. **Caching**: Cache static data where appropriate
10. **Rate Limiting**: Protect API from abuse

---

## ✅ Definition of Done (DoD)
For each phase to be considered complete:
1. ✅ Database schema designed and migrations created
2. ✅ Prisma models defined
3. ✅ Repositories implemented
4. ✅ Services implemented with business logic
5. ✅ Controllers created
6. ✅ Routes defined with validations
7. ✅ Swagger/OpenAPI documentation added
8. ✅ Error handling implemented
9. ✅ Basic tests written
10. ✅ Code reviewed and merged

---

## 🎯 Development Workflow
1. **Create feature branch** from `main`
2. **Implement feature** following architecture
3. **Write basic tests**
4. **Update Swagger docs**
5. **Create Pull Request**
6. **Code review**
7. **Merge to main** and deploy

---

## 📞 Support & Questions
Refer to:
- Swagger UI: `https://coresy-backend-production.up.railway.app/api-docs
- Frontend Developer Guide: `FRONTEND_DEVELOPER_GUIDE.md
