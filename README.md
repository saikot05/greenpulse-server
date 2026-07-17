# GreenPulse AI - Backend Server

This is the backend server for the GreenPulse AI SaaS application.
Built using Node.js, Express, TypeScript, and following Clean Architecture and Repository Pattern principles.

## Structure and Setup

- **Phase 1: Foundation**: Set up Express application with CORS, request logging, custom operational error wrapping (`AppError`), and async wrapper utilities (`asyncHandler`).
- **Phase 2: Database Layer**: Configured Mongoose 8.x database connection pool with automatic teardowns and gracefully decoupled User, ESG Audit, Carbon analysis, Conversational history, and Notification models.
- **Phase 3: Validation & Repositories**: Integrated Zod request validation filters and instantiated abstract database queries (`BaseRepository<T>`) for clean and modular query interactions.
