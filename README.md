# JAGStaff

A staff web portal for JAG Schools built with React + Vite and Supabase.

## Features

- **Dashboard** — at-a-glance view for the day
- **Gradebook** — rubric-based grading with AI-assisted grader
- **Hall Pass** — issue and track hall passes with analytics
- **Student Roster** — manage enrollment and classroom assignments
- **Field Trips** — trip planning and student roster management
- **CEU Tracker** — log and track continuing education hours
- **Requisitions** — submit and manage supply requests
- **Infractions** — record and review student infractions
- **Weekly Events** — post and view school-wide announcements

## Getting started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)

### Setup

```bash
# Install dependencies
npm install

# Copy the example env file and fill in your Supabase credentials
cp .env.example .env.local
```

Edit `.env.local` with your values from **Supabase Dashboard → Project Settings → API**:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_PUBLIC_KEY
```

See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for full database schema and RLS setup.

### Run locally

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

## Tech stack

- [React 18](https://react.dev) + [Vite](https://vitejs.dev)
- [Supabase](https://supabase.com) — auth, database, storage
- [pdf.js](https://mozilla.github.io/pdf.js/) — PDF rendering
