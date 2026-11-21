# LINKORA — SEO & Backlink Management Automation Platform

> A premium, modern, visually impressive SaaS platform for SEO & Backlink Management inspired by *backlinkmanagement.io*.

![Linkora Dashboard](https://img.shields.io/badge/LINKORA-SEO%20Platform-10B981?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Phase%202%20Auth%20(Local%20%2B%20Google%20OAuth)-blue?style=for-the-badge)
![Stack](https://img.shields.io/badge/Stack-React%20%7C%20Express%20%7C%20MongoDB%20%7C%20Passport.js%20Google%20OAuth-black?style=for-the-badge)

---

## 1. Project Overview

**LINKORA** is a centralized command center for modern SEO teams, growth leads, and link builders. The platform provides real-time visibility into backlink acquisition, link profile health, content production velocity, and automated alerts for lost high-authority backlinks.

**Phase 2 includes:**
- **Complete Dashboard Module**: Multi-series backlink growth charts, link attributes donut, recent backlinks table, live activity timeline, monthly content progress, and actionable alerts.
- **Full Backend Database & Dual Authentication (Local + Google OAuth 2.0)**:
  - MongoDB database integration with Mongoose.
  - User model supporting both email/password accounts and Google OAuth accounts.
  - Safe account linking: Existing local accounts can be safely linked with Google accounts using the same verified email.
  - Google-only accounts work without requiring a password.
  - Password hashing with bcrypt (10 rounds).
  - Passport.js Local Strategy & Passport Google OAuth 2.0 Strategy (`passport-google-oauth20`).
  - MongoDB-backed persistent session storage using `connect-mongo`.
  - Rate limiting on authentication endpoints to prevent brute-force abuse.
  - Protected API routes and protected React routes.
  - Dedicated, beautifully styled Login and Signup pages with **"Continue with Google"** buttons.

---

## 2. Technology Stack

### Frontend
- **React 18** (Functional components, custom hooks, React Context)
- **Vite** (Ultra-fast build & development tooling)
- **JavaScript** (Modern ES modules, no TypeScript)
- **Tailwind CSS** (Custom dark theme with emerald growth accents `#10B981`, surfaces `#15191E`, `#1B2026`)
- **React Router DOM v6** (Nested layout routing, deep links, protected routes)
- **Recharts** (Interactive multi-series backlink growth area charts, donut distribution)
- **Lucide React** (Clean, consistent iconography)

### Backend
- **Node.js** (v18+)
- **Express.js** (REST API)
- **MongoDB & Mongoose** (Data modeling, schema validation, and persistence)
- **Passport.js & Passport Local Strategy** (Session-based user authentication)
- **Passport Google OAuth 2.0** (`passport-google-oauth20` for Google Sign-In)
- **Express Session & connect-mongo** (MongoDB-backed persistent session store)
- **bcryptjs** (Secure 10-round password hashing)
- **express-rate-limit** (Brute-force protection on auth endpoints)
- **CORS** (`credentials: true` for secure cross-origin cookie sharing)
- **Dotenv** (Environment configuration)

---

## 3. Architecture & Folder Structure

```
Backlink-Management-Project/
├── .gitignore                      # Git ignore rules for node_modules, env, logs, dist
├── package.json                    # Root scripts & dev dependencies (concurrently)
├── README.md                       # Complete documentation
├── server/
│   ├── .env.example                # Sample environment variables
│   ├── .env                        # Local environment variables (with Google credentials)
│   ├── package.json                # Server dependencies
│   ├── server.js                   # HTTP server entrypoint (port 5002 and compatibility listener on 5000)
│   ├── app.js                      # Express application, sessions, CORS, Passport, routes
│   ├── config/
│   │   ├── db.js                   # Reusable Mongoose connection with embedded fallback
│   │   └── passport.js             # Passport Local + Google OAuth 2.0 configuration
│   ├── models/
│   │   └── User.js                 # User schema (googleId, avatar, providers, safe DTO)
│   ├── middleware/
│   │   ├── authMiddleware.js       # ensureAuthenticated & ensureAdmin middleware
│   │   └── rateLimiter.js          # express-rate-limit for auth endpoints
│   ├── routes/
│   │   ├── authRoutes.js           # Auth routes (/signup, /login, /logout, /me, /status, /google)
│   │   ├── dashboardRoutes.js      # Protected dashboard metrics routes
│   │   └── campaignRoutes.js       # Protected campaign creation routes
│   ├── controllers/
│   │   ├── authController.js       # Signup, login, logout, me, status, Google OAuth logic
│   │   ├── dashboardController.js  # Dashboard overview, growth, backlinks, alerts
│   │   └── campaignController.js   # Campaign management & activity sync
│   └── data/
│       ├── mockDashboard.js        # Overview KPIs, websites list, sparklines
│       ├── mockGrowth.js           # Growth series (7D, 30D, 90D, 12M)
│       ├── mockBacklinks.js        # Detailed recent backlinks table data
│       ├── mockActivity.js         # Real-time activity timeline feed
│       ├── mockContent.js          # Content production metrics & monthly target
│       └── mockAlerts.js           # Actionable alerts (lost links, review, errors)
└── client/
    ├── index.html                  # HTML5 shell with Google Inter font
    ├── package.json                # Frontend dependencies
    ├── vite.config.js              # Vite config with API proxy
    ├── tailwind.config.js          # Tailored dark theme design system
    ├── postcss.config.js           # PostCSS configuration
    └── src/
        ├── index.css               # Global CSS & scrollbar styling
        ├── main.jsx                # Application entrypoint
        ├── App.jsx                 # Route hierarchy, AuthProvider & protected routes
        ├── api/
        │   ├── apiService.js       # Dashboard API service with session credentials
        │   └── authService.js      # Auth API service (signup, login, logout, me)
        ├── context/
        │   ├── AuthContext.jsx     # User authentication state (user, login, signup, logout)
        │   ├── DashboardContext.jsx# Dashboard state (website, date range, charts)
        │   └── ToastContext.jsx    # Toast notification engine
        ├── components/
        │   ├── auth/
        │   │   └── ProtectedRoute.jsx # Route guard with session verification
        │   ├── common/             # Toast, Modal, StatusBadge, Skeletons, SearchPalette
        │   └── dashboard/          # Welcome, KPIs, Charts, Tables, Timelines, Alerts
        ├── layouts/
        │   ├── MainLayout.jsx      # Shell layout wrapper & modal mounts
        │   ├── Sidebar.jsx         # Responsive sidebar with dynamic user profile & avatar
        │   └── TopHeader.jsx       # Header with user avatar, logout & notifications
        ├── pages/
        │   ├── LoginPage.jsx       # Login page with "Continue with Google"
        │   ├── SignupPage.jsx      # Signup page with "Continue with Google"
        │   ├── DashboardPage.jsx   # Primary dashboard module
        │   └── ComingSoonPage.jsx  # Polished placeholder for future modules
        └── utils/
            ├── formatters.js       # Number formatting, compact values (K/M), percentages
            └── exportCsv.js        # Client-side dynamic CSV generator
```

---

## 4. Installation & Setup

### Prerequisites
- **Node.js** (v18.0.0 or later)
- **npm** (v9.0.0 or later)

### Quick One-Step Setup
Run the following from the root directory:
```bash
npm run install:all
```

---

## 5. Running the Application

### Option A: Run Frontend & Backend Concurrently (Recommended)
From the project root:
```bash
npm run dev
```
- **Backend API**: [`http://localhost:5002`](http://localhost:5002)
- **Frontend Dashboard**: [`http://localhost:5173`](http://localhost:5173)

### Option B: Run Individually
```bash
# Backend Server
npm run server

# Frontend Client
npm run client
```

---

## 6. Authentication & Google OAuth Details

### Google OAuth Flow
1. User clicks **"Continue with Google"** on either `/login` or `/signup`.
2. Frontend redirects to `http://localhost:5002/api/auth/google`.
3. Backend redirects user to Google's consent screen (`https://accounts.google.com/o/oauth2/v2/auth`).
4. User selects Google account and approves requested scopes (`profile`, `email`).
5. Google redirects back to `http://localhost:5000/auth/google/callback` (or `http://localhost:5002/api/auth/google/callback`).
6. The backend verifies the profile, creates a new user or safely links to an existing user with the same email, establishes an authenticated session (`req.login`), and redirects to `http://localhost:5173/?oauth=success`.
7. The user lands directly on the Dashboard, with their Google profile photo and name displayed in the header and sidebar.

### Authentication APIs (`/api/auth`)

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Public | Register new user with email/password; hashes password & logs in (Rate limited) |
| `POST` | `/api/auth/login` | Public | Authenticates credentials via Passport Local Strategy and establishes session (Rate limited) |
| `POST` | `/api/auth/logout` | Authenticated | Terminates Passport login, destroys MongoDB session, and clears `connect.sid` cookie |
| `GET` | `/api/auth/me` | Authenticated | Returns current authenticated user object (safe DTO, excluding password) |
| `GET` | `/api/auth/status` | Public | Returns `{ success: true, isAuthenticated: boolean, user: Object \| null }` |
| `GET` | `/api/auth/google` | Public | Initiates Google OAuth consent flow |
| `GET` | `/api/auth/google/callback` | Public | Handles Google OAuth verification & session establishment |
| `GET` | `/auth/google/callback` | Public | Direct root callback endpoint for Google Cloud Console compatibility |

---

## 7. Sample Credentials for Testing

### Option 1: Google Sign-In
Click **"Continue with Google"** on either the Login or Signup page.

### Option 2: Email & Password
You can register any new account on `/signup`, or sign in with:
- **Email**: `alex@growthlabs.io`
- **Password**: `password123`
*(An **"Autofill Demo Login"** button is also available on the Login page).*
