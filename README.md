# Gyan Ghar Accountability App

This is a production accountability dashboard designed for tracking daily spiritual practices of students in a residential hostel setting. It features role-based access control, comprehensive data visualization, and automated reporting.

> **Note**: This is a sanitized version of a live production application. The [demo pages](./demo/) showcase the UI with sample data.

---

## Why Gyan Ghar Accountability App?

Traditional paper-based accountability systems are inefficient and lack insights. This applcation digitizes the entire workflow—from daily entry submission to weekly performance reports—while providing real-time visibility to guardians and administrators.

The application is designed for reliability, simplicity, and mobile-first usage, reflecting the daily routines of hostel students.

## Design Principles

- **Mobile-first** — Optimized for smartphone usage with responsive design
- **Role-based access** — Clear separation between students, monitors, poshak leaders, and admins
- **Real-time insights** — Color-coded dashboards highlight performance at a glance
- **Data integrity** — Soft delete, audit logging, and comprehensive validation
- **Security-first** — Rate limiting, input sanitization, JWT authentication

## Core Capabilities

- Daily accountability form with 12+ tracked metrics
- Role-based dashboard with sorting, filtering, and column customization
- Missing entry detection and alerts
- Student profile management with extended family details
- Poshak leader and monitor assignment system
- Weekly automated email reports
- Export to Excel functionality
- Password reset via email

## User Roles

| Role                      | Permissions                                                      |
| ------------------------- | ---------------------------------------------------------------- |
| **Admin**           | Full access: user approval, role assignment, all data management |
| **Poshak Leader**   | View dashboards, student profiles, assign monitors to students   |
| **Monitor Student** | Fill entries for assigned students, view all dashboards          |
| **Student**         | Submit own daily entries, view dashboard, personal reports       |

## Tech Stack

| Layer          | Technology                               |
| -------------- | ---------------------------------------- |
| Frontend       | React.js, Tailwind CSS, Axios            |
| Backend        | Node.js, Express.js                      |
| Database       | MySQL                                    |
| Authentication | JWT + bcrypt                             |
| Security       | Helmet, express-validator, rate-limiting |
| Logging        | Winston                                  |
| Scheduling     | node-cron                                |
| Email          | Brevo API                                |

## API Overview

All endpoints are prefixed with `/api`.

### Authentication

```
POST /api/auth/register      - User registration (requires admin approval)
POST /api/auth/login         - JWT token generation
POST /api/auth/forgot-password - Password reset email
POST /api/auth/reset-password  - Password reset with token
```

### Users

```
GET  /api/users/me           - Current user details
GET  /api/users/pending      - Pending registrations (admin)
POST /api/users/approve/:id  - Approve user (admin)
GET  /api/users/students     - List all students
PUT  /api/users/:id          - Update user
DELETE /api/users/:id        - Delete user (admin)
PUT  /api/users/:id/toggle-active - Soft delete toggle
```

### Accountability

```
POST /api/accountability/create    - Create/update daily entry
GET  /api/accountability/list      - List entries with filters
GET  /api/accountability/report    - Date range report with pagination
GET  /api/accountability/user-settings - Column preferences
PUT  /api/accountability/user-settings - Save preferences
```

### Assignments

```
GET  /api/assignments/poshak       - Poshak assignments
POST /api/assignments/poshak       - Create poshak assignment
GET  /api/assignments/monitor      - Monitor assignments
POST /api/assignments/monitor      - Create monitor assignment
```

### System

```
GET /api/health                    - Health check
```

## Database Schema

See [docs/SCHEMA.md](./docs/SCHEMA.md) for complete schema documentation.

### Core Tables

- `users` — All user roles with authentication data
- `student_profiles` — Extended student information
- `accountability_entries` — Daily practice records
- `poshak_assignments` — Student-to-poshak mapping
- `monitor_assignments` — Student-to-monitor mapping
- `password_reset_tokens` — Password reset management

## Architecture Decisions

Key design decisions are documented as ADRs in [docs/adr/](./docs/adr/):

| ADR                                             | Decision                  |
| ----------------------------------------------- | ------------------------- |
| [001](./docs/adr/001-role-based-access-control.md) | Role-Based Access Control |
| [002](./docs/adr/002-jwt-authentication.md)        | JWT Authentication        |
| [003](./docs/adr/003-mobile-first-design.md)       | Mobile-First Design       |
| [004](./docs/adr/004-soft-delete-pattern.md)       | Soft Delete Pattern       |
| [005](./docs/adr/005-security-measures.md)         | Security Measures         |
| [006](./docs/adr/006-weekly-email-reports.md)      | Weekly Email Reports      |

## Security

- **Password hashing**: bcrypt with 12 rounds
- **Rate limiting**: 100 req/15min general, 5 req/15min auth
- **Input validation**: express-validator on all endpoints
- **XSS protection**: Output escaping, Helmet.js headers
- **SQL injection**: Parameterized queries only
- **CORS**: Environment-specific origins
- **Payload limits**: 10KB max request body

## Development

### Prerequisites

- Node.js 18+
- MySQL 8.0+
- npm or yarn

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env  # Configure your environment
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

### Database Setup

```bash
mysql -u root -p < backend/database/schema.sql
```

## Environment Variables

See [backend/.env.example](./backend/.env.example) for all configuration options.

Key variables:

| Variable                           | Description                           |
| ---------------------------------- | ------------------------------------- |
| `JWT_SECRET`                     | Secret for JWT signing                |
| `DB_HOST`, `DB_NAME`, etc.     | MySQL connection                      |
| `SMTP_HOST`, `SMTP_USER`, etc. | Email configuration                   |
| `BCRYPT_ROUNDS`                  | Password hashing rounds (default: 12) |

## Demo

Static demo pages are available in the [demo/](./demo/) folder:

- [Demo Home](./demo/index.html) — Landing page with role selection
- [Student View](./demo/student.html) — Student dashboard and form
- [Admin View](./demo/admin.html) — Admin panel with user management
- [Poshak View](./demo/poshak.html) — Poshak leader dashboard

## Project Structure

```
gyan-ghar/
├── backend/
│   ├── config/           # Database, email, logging
│   ├── cron/             # Scheduled jobs
│   ├── database/         # Schema and migrations
│   ├── middleware/       # Auth, rate limiting, error handling
│   ├── routes/           # API endpoints
│   └── server.js         # Express app
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── contexts/     # React contexts
│   │   ├── pages/        # Page components
│   │   └── utils/        # API client, utilities
│   └── public/           # Static assets
├── demo/                 # Static demo pages
└── docs/                 # Documentation and ADRs
```

## Future Roadmap

- [ ] PII enryption at rest
- [ ] PWA support for offline entry submission
- [ ] Dashboard analytics with charts
- [ ] Bulk entry import/export
- [ ] Student education progress tracking
- [ ] Fees management

## Author

Built by **Pranay Patel** as a full-stack web application for real-world community use.

## License

This project is provided for portfolio and educational purposes. Contact the author for licensing inquiries.
