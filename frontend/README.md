# SSA Intelligence Frontend

React + Vite frontend for the SSA Intelligence research and news workflow.

## Features
- Create research jobs with report type selection and section customization.
- Live status tracking with rerun, cancel, and delete actions.
- Report detail view with section navigation and resolved sources.
- Admin user management (when signed in as admin).
- News intelligence dashboard and setup flows.

## Getting started
```
npm install
npm run dev
```

The dev server runs on http://localhost:5176 by default.

## API configuration
API requests are proxied through Vite:
- Default: `/api` (proxy target set in `vite.config.ts`)
- Override: set `VITE_API_BASE_URL` to a full backend URL

If you change the frontend port, update the backend `CORS_ORIGIN` accordingly.

## Key folders
- `src/pages/`: top-level routes (home, new research, admin, news)
- `src/components/`: shared UI components
- `src/services/`: API client + hooks
- `src/types.ts`: shared types