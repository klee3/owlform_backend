# OwlForm Backend

A NestJS-based backend API for OwlForm - a form builder and management platform.

## Features

- **Multi-tenant Architecture**: Organizations and Workspaces for organizing forms
- **User Authentication**:
  - Email/password authentication with JWT tokens
  - Google OAuth 2.0 integration
  - Session management with refresh tokens
- **Form Management**: Create and manage forms with submissions
- **Role-based Access**: Admin and Member roles within organizations/workspaces
- **Security**: Helmet for security headers, cookie-based authentication, CORS support
- **Logging**: Winston-based logging with daily rotation

## Tech Stack

- **Framework**: NestJS (Node.js)
- **Database**: MySQL with Prisma ORM
- **Authentication**: Passport.js (JWT + Google OAuth)
- **Validation**: Zod + class-validator
- **Logging**: Winston with daily rotate file transport
- **Security**: Helmet, cookie-parser

## Project Structure

```
src/
├── auth/           # Authentication module (login, register, OAuth)
├── user/           # User management
├── organization/   # Organization management
├── workspace/      # Workspace management
├── form/           # Form and submission management
├── prisma/         # Prisma database client
├── config/         # Configuration management
├── logger/         # Winston logging configuration
└── common/         # Shared utilities and decorators
```

## Prerequisites

- Node.js (LTS version)
- pnpm (package manager)
- MySQL database

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Install dependencies
pnpm install
```

### 2. Configure Environment Variables

Copy the example environment file and update it with your values:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server
PORT=8080

# Google OAuth (optional)
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_CALLBACK_URL=http://localhost:8080/auth/google/callback

# JWT Configuration
JWT_SECRET=<your-access-token-secret>
JWT_EXPIRE_IN=1h

JWT_REFRESH_SECRET=<your-refresh-token-secret>
JWT_REFRESH_EXPIRE_IN=7d

# Database
DATABASE_URL="mysql://root:password@localhost:3306/owlform"

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

### 3. Set Up Database

```bash
# Generate Prisma client
pnpm prisma generate

# Push schema to database (for development)
pnpm prisma db push

# Or create a migration (for production)
pnpm prisma migrate dev
```

### 4. Run the Application

```bash
# Development (with hot reload)
pnpm run start:dev

# Production build
pnpm run build
pnpm run start:prod
```

The server will start on `http://localhost:8080` (or the PORT you specified).

## API Endpoints

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with email/password
- `POST /auth/logout` - Logout and invalidate session
- `POST /auth/refresh` - Refresh access token
- `GET /auth/google` - Google OAuth login
- `GET /auth/google/callback` - Google OAuth callback
- `POST /auth/verify-email` - Verify email with token

### Users

- `GET /user/me` - Get current user profile

### Organizations

- CRUD operations for organizations

### Workspaces

- CRUD operations for workspaces within organizations

### Forms

- CRUD operations for forms within workspaces
- Submit form responses
- View form submissions

## Available Scripts

```bash
# Development
pnpm run start          # Start the application
pnpm run start:dev      # Start with hot reload
pnpm run start:debug   # Start with debugging

# Build
pnpm run build         # Build for production

# Code Quality
pnpm run lint          # Lint and fix code
pnpm run format        # Format code with Prettier
```

## Database Schema

The application uses the following main models:

- **User**: Authentication and profile information
- **Organization**: Top-level container for teams
- **Workspace**: Sub-container within organizations
- **Form**: Form definitions with name, description, and slug
- **FormSubmission**: Form response data stored as JSON

## Security Considerations

- All passwords are hashed using Argon2
- JWT tokens are used for API authentication
- Refresh tokens are stored in the database with IP/userAgent tracking
- CORS is configured to only allow your frontend origin
- Helmet middleware adds security headers
- Input validation using Zod schemas
- SQL injection prevention via Prisma ORM

## License

UNLICENSED
