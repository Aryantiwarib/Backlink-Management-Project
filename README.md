# LINKORA — SEO & Backlink Management Automation Platform

> A premium, modern, visually impressive dashboard prototype for an SEO & Backlink Management SaaS platform inspired by *backlinkmanagement.io*.

![Linkora Dashboard](https://img.shields.io/badge/LINKORA-SEO%20Platform-10B981?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Prototype%20v1.0-blue?style=for-the-badge)
![Stack](https://img.shields.io/badge/Stack-React%20%7C%20Express%20%7C%20TailwindCSS-black?style=for-the-badge)

---

## 1. Project Overview

**LINKORA** is designed as a centralized command center for modern SEO teams, growth leads, and link builders. The platform provides real-time visibility into backlink acquisition, link profile health, content production velocity, and automated alerts for lost high-authority backlinks.

This prototype implements the complete **FIRST MODULE: DASHBOARD** with a dark SaaS aesthetic (inspired by Linear, Stripe, and Vercel) with emerald green SEO growth accents, clean typography, high-density layouts, Recharts analytics, and an Express REST API backend.

---

## 2. Technology Stack

### Frontend
- **React 18** (Functional components, custom hooks, React Context)
- **Vite** (Ultra-fast build & development tooling)
- **JavaScript** (Modern ES modules, no TypeScript)
- **Tailwind CSS** (Custom dark theme with emerald growth accents `#10B981`, surfaces `#15191E`, `#1B2026`)
- **React Router DOM v6** (Nested layout routing, deep links, coming-soon module states)
- **Recharts** (Interactive multi-series backlink growth area charts, donut distribution)
- **Lucide React** (Clean, consistent iconography)

### Backend
- **Node.js** (v18+)
- **Express.js** (REST API)
- **CORS** & JSON Body Parsers
- **Centralized Mock Data** (Structured deterministic datasets)
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
│   ├── .env                        # Local environment variables
│   ├── package.json                # Server dependencies & scripts
│   ├── server.js                   # HTTP server entrypoint
│   ├── app.js                      # Express application & middleware setup
│   ├── routes/
│   │   ├── dashboardRoutes.js      # Routes for overview, growth, backlinks, alerts
│   │   └── campaignRoutes.js       # Routes for campaign creation & retrieval
│   ├── controllers/
│   │   ├── dashboardController.js  # Controller handlers for dashboard endpoints
│   │   └── campaignController.js   # Controller handlers for campaigns
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
        ├── App.jsx                 # Route hierarchy & global providers
        ├── api/
        │   └── apiService.js       # Resilient API service with offline fallback
        ├── context/
        │   ├── DashboardContext.jsx# Global state (website, date range, charts)
        │   └── ToastContext.jsx    # Toast notification engine
        ├── layouts/
        │   ├── MainLayout.jsx      # Application layout shell
        │   ├── Sidebar.jsx         # Collapsible responsive sidebar
        │   └── TopHeader.jsx       # Header with website & date range pickers
        ├── pages/
        │   ├── DashboardPage.jsx   # Primary dashboard module
        │   └── ComingSoonPage.jsx  # Polished placeholder for future modules
        ├── components/
        │   ├── common/
        │   │   ├── Toast.jsx       # Interactive animated toasts
        │   │   ├── Modal.jsx       # Accessible backdrop dialog
        │   │   ├── StatusBadge.jsx # Color-coded status pills
        │   │   ├── SkeletonLoader.jsx # Loading shimmer states
        │   │   ├── SearchModal.jsx # Cmd+K quick command & search modal
        │   │   └── AlertDetailModal.jsx # Detailed modal for action items
        │   └── dashboard/
        │       ├── WelcomeSection.jsx      # Top greeting, export & new campaign
        │       ├── KpiCards.jsx            # 4 Primary KPI cards + sparklines
        │       ├── BacklinkGrowthChart.jsx # Recharts multi-series area chart
        │       ├── LinkAttributesDonut.jsx # Recharts donut link attributes
        │       ├── RecentBacklinksTable.jsx# Searchable, filterable backlinks table
        │       ├── RecentActivityTimeline.jsx # Live activity events stream
        │       ├── ContentOverviewCard.jsx # Monthly target & content status
        │       ├── ActionableAlerts.jsx    # Actionable "Needs Attention" card
        │       └── NewCampaignModal.jsx    # Interactive campaign creation form
        └── utils/
            ├── formatters.js       # Comma numbers, compact formatting, percentages
            └── exportCsv.js        # Client-side dynamic CSV generator
```

---

## 4. Installation & Setup

### Prerequisites
- **Node.js** (v18.0.0 or later recommended)
- **npm** (v9.0.0 or later)

### Quick One-Step Setup
Run the following from the root directory:
```bash
npm run install:all
```
*This installs root dev tools, server dependencies, and client dependencies.*

Or install each individually:
```bash
# 1. Install root dependencies
npm install

# 2. Install server dependencies
cd server && npm install

# 3. Install client dependencies
cd ../client && npm install
```

---

## 5. Running the Application

### Option A: Run Both Client and Server Concurrently (Recommended)
From the project root:
```bash
npm run dev
```
- **Backend API**: running at `http://localhost:5001`
- **Frontend Dashboard**: running at `http://localhost:5173`

### Option B: Run Backend Separately
```bash
npm run server
# or
cd server && npm run dev
```

### Option C: Run Frontend Separately
```bash
npm run client
# or
cd client && npm run dev
```

---

## 6. REST API Endpoints

The backend provides clean, RESTful JSON endpoints:

| Method | Endpoint | Description | Query Parameters |
|---|---|---|---|
| `GET` | `/api/health` | Service health check & uptime | None |
| `GET` | `/api/dashboard/overview` | KPI metrics, domain list, link attributes | `website` (`growthlabs.io`, etc.), `range` (`7d`, `30d`, `90d`, `this_month`) |
| `GET` | `/api/dashboard/backlink-growth` | Time-series data points for growth chart | `range` (`7D`, `30D`, `90D`, `12M`) |
| `GET` | `/api/dashboard/recent-backlinks` | List of discovered backlinks | `search`, `status` (`all`, `active`, `new`, `lost`), `limit` |
| `GET` | `/api/dashboard/recent-activity` | Timeline stream of backlink & SEO events | None |
| `GET` | `/api/dashboard/content-overview` | Content stage counts & monthly target progress | None |
| `GET` | `/api/dashboard/alerts` | Urgent actionable alerts & details | None |
| `POST` | `/api/campaigns` | Create a new link acquisition campaign | Body: `{ name, targetWebsite, campaignType, targetLinks, notes }` |

---

## 7. Key Features & Interactivity

1. **Dashboard Header & Filters**:
   - **Website Switcher**: Switch between `growthlabs.io`, `saasmetrics.co`, and `fintechpulse.com`.
   - **Date Range Selector**: Filter metrics by `Last 7 days`, `Last 30 days`, `Last 90 days`, and `This month`.
   - **Command Palette (`⌘K` / `Ctrl+K`)**: Instant search across pages and quick actions.
   - **Notification Dropdown**: Real-time alerts counter and quick list.
2. **Welcome Section**:
   - **Export Report**: Generates and downloads a real CSV file containing current KPI metrics and backlinks.
   - **+ New Campaign**: Interactive modal with input validation, strategy selection, and instant timeline sync with toast notifications.
3. **4 Primary KPI Cards**:
   - Total Backlinks (`24,856`, `+12.8%`), Referring Domains (`8,492`, `+6.4%`), New Backlinks (`1,284`, `+18.2%`), Lost Backlinks (`186`, `-4.6%`).
   - SVG sparklines displaying trend trajectories.
4. **Backlink Growth Chart**:
   - Recharts multi-series Area Chart (New Backlinks, Net Growth, Lost Backlinks).
   - Time filters (`7D`, `30D`, `90D`, `12M`) updating data points deterministically.
   - Custom dark glassmorphic tooltip.
5. **Link Attributes Donut**:
   - Dofollow (`68%`), Nofollow (`24%`), Sponsored (`5%`), UGC (`3%`).
   - Legend with exact link counts and status indicator.
6. **Recently Acquired Backlinks Table**:
   - TechCrunch, DesignRush, GrowthHackers, Dev.to, Startup.info, HubSpot, etc.
   - Visual Domain Rating (DR) progress meter, traffic metrics, status badges, and search/filter.
   - "View All" redirects to the Backlinks module.
7. **Actionable Alerts ("Needs Attention")**:
   - Interactive modals for "Review Links", "Review Content", and "View Errors" with resolution actions.
8. **Responsive Collapsible Sidebar**:
   - Collapsible desktop view with icon tooltips; mobile sliding drawer.
   - Navigation links to placeholder pages with roadmap previews.
