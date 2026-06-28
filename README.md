# CoreSY Backend

Production-ready enterprise Node.js backend built with Express.js, PostgreSQL, Prisma ORM, JWT authentication, and Redis.

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js 22 LTS | Runtime |
| Express.js 5 | Web framework |
| PostgreSQL 16 | Primary database |
| Prisma ORM | Database access layer |
| Redis 7 | Caching & sessions |
| JWT | Authentication |
| Swagger/OpenAPI 3.0 | API documentation |
| Winston + Morgan | Logging |
| Docker | Containerization |
| Jest + Supertest | Testing |

## Project Structure

```
CoreSY-Backend/
├── src/
│   ├── config/          # Environment, database, Redis configuration
│   ├── controllers/     # HTTP request handlers (thin layer)
│   ├── services/        # Business logic layer
│   ├── repositories/    # Data access layer (Prisma)
│   ├── routes/          # API route definitions
│   ├── middlewares/     # Express middleware (auth, errors, validation)
│   ├── validators/      # Request validation schemas
│   ├── models/          # Domain model transformers
│   ├── utils/           # Utility functions (JWT, password, logger)
│   ├── helpers/         # Response helpers
│   ├── constants/       # Application constants
│   ├── swagger/         # Swagger/OpenAPI configuration
│   ├── docs/            # Swagger JSDoc annotations
│   ├── database/        # Database utilities
│   ├── prisma/          # Prisma client re-export
│   ├── logs/            # Application log files
│   ├── app.js           # Express app configuration
│   └── server.js        # Server entry point
├── tests/               # Jest test suites
├── docker/              # Dockerfile
├── prisma/              # Prisma schema & migrations
├── docker-compose.yml   # Multi-container orchestration
├── .env.example         # Environment variable template
└── package.json
```

## Prerequisites

- [Node.js 22 LTS](https://nodejs.org/) (or later)
- [Docker](https://www.docker.com/) & Docker Compose (optional, for containerized setup)
- [PostgreSQL 16](https://www.postgresql.org/) (if running locally without Docker)
- [Redis 7](https://redis.io/) (if running locally without Docker)

## Quick Start

### Option 1: Docker (Recommended)

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd CoreSY-Backend
   ```

2. **Create environment file**

   ```bash
   cp .env.example .env
   ```

3. **Start all services with Docker Compose**

   ```bash
   docker-compose up -d
   ```

4. **Run database migrations**

   ```bash
   docker-compose exec api npm run prisma:migrate
   ```

5. **Access the application**

   - API: http://localhost:3000/api/v1
   - Health Check: http://localhost:3000/api/v1/health
   - Swagger Docs: http://localhost:3000/api-docs

### Option 2: Local Development

1. **Clone and install dependencies**

   ```bash
   git clone <repository-url>
   cd CoreSY-Backend
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Update `.env` with your local PostgreSQL and Redis connection details.

3. **Start PostgreSQL and Redis** (ensure they are running locally)

4. **Generate Prisma client and run migrations**

   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

5. **Start development server with hot reload**

   ```bash
   npm run dev
   ```

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server with hot reload (Nodemon) |
| `npm run start` | Start production server |
| `npm run test` | Run Jest test suite |
| `npm run lint` | Run ESLint code analysis |
| `npm run format` | Format code with Prettier |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations (dev) |
| `npm run prisma:studio` | Open Prisma Studio GUI |
| `npm run prisma:deploy` | Deploy migrations (production) |

## API Documentation

Swagger UI is available at:

```
http://localhost:3000/api-docs
```

Raw OpenAPI 3.0 JSON spec:

```
http://localhost:3000/api-docs.json
```

Add JSDoc `@swagger` annotations to route files to automatically document new endpoints.

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | — |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | JWT signing secret | — |
| `JWT_EXPIRES_IN` | Access token expiry | `7d` |
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated) | `http://localhost:3000` |
| `LOG_LEVEL` | Winston log level | `info` |

See `.env.example` for the complete list.

## Architecture

The project follows a layered architecture adhering to SOLID principles:

```
Request → Route → Controller → Service → Repository → Database
                     ↓
               Middleware (Auth, Validation, Error Handling)
```

- **Controllers**: Handle HTTP requests/responses only
- **Services**: Contain all business logic
- **Repositories**: Abstract database operations via Prisma
- **Middlewares**: Cross-cutting concerns (auth, validation, logging, errors)

## Docker Services

| Service | Port | Description |
|---|---|---|
| `api` | 3000 | Node.js Express API |
| `postgres` | 5432 | PostgreSQL 16 database |
| `redis` | 6379 | Redis 7 cache |

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop all services
docker-compose down

# Rebuild after changes
docker-compose up -d --build
```

## Testing

```bash
# Run all tests
npm run test

# Run with coverage
npm run test -- --coverage
```

## Production Deployment

1. Set `NODE_ENV=production` in environment
2. Configure all required environment variables (see `.env.example`)
3. Build and run the production Docker image:

   ```bash
   docker build -f docker/Dockerfile --target production -t coresy-api .
   docker run -p 3000:3000 --env-file .env coresy-api
   ```

4. Deploy database migrations:

   ```bash
   npm run prisma:deploy
   ```

## License

MIT
