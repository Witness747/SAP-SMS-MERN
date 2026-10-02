# Deployment Guide

This project deploys as a React/Vite frontend on Vercel, an Express API on Railway or Render, and MongoDB Atlas. The frontend and API remain separate services.

## MongoDB Atlas

Create an Atlas database user and database, allow the backend host to connect through the Atlas network access list, and copy the SRV connection string into the backend's `MONGODB_URI` environment variable. Keep the URI private. The API health check returns HTTP 503 while MongoDB is unavailable.

## Backend on Railway or Render

Create a Node service with `backend` as its root directory and `npm start` as its start command. The server listens on `process.env.PORT` and binds to the host platform's default interface.

Configure these backend environment variables in the hosting dashboard:

| Variable | Requirement | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Required | Atlas connection string |
| `JWT_SECRET` | Required, 32+ characters | Signs authentication tokens; use a unique random secret |
| `JWT_EXPIRES_IN` | Optional; defaults to `7d` | Token lifetime accepted by `jsonwebtoken` |
| `NODE_ENV` | Set to `production` | Production logging and CORS behavior |
| `CLIENT_URL` | Required for browser access | Exact Vercel origin, for example `https://your-app.vercel.app`, without a trailing slash |
| `PORT` | Platform provided | HTTP listener port |
| `APP_TIMEZONE` | Optional | Reminder fallback timezone when a user timezone is unavailable |
| `VAPID_PUBLIC_KEY` | Optional | Public Web Push application server key |
| `VAPID_PRIVATE_KEY` | Optional, secret | Private Web Push application server key |
| `VAPID_SUBJECT` | Optional | Contact URI for Web Push, such as a `mailto:` address |

Production CORS allows only the exact `CLIENT_URL`. Set that value to the deployed frontend origin. The backend exposes `GET /api/health`; configure the host health check to use this path. It reports healthy only when MongoDB responds to the database ping.

The P2.1 reminder scheduler runs in the backend process every 60 seconds. Keep one backend instance for the MVP; the MongoDB ledger reduces duplicate sends but an in-process scheduler is not a distributed queue.

Web Push reminders require valid production VAPID keys. Without both keys the API stays available, but push delivery is skipped. Generate a key pair with `npx web-push generate-vapid-keys` in a trusted environment and configure the public and private values in the backend host. Never put the private key in frontend variables, source control, or documentation.

## Frontend on Vercel

Create a Vercel project with `frontend` as its root directory. Use the Vite build command `npm run build` and output directory `dist`. Set this frontend environment variable for Production (and Preview if required):

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Full HTTPS API base including `/api`, for example `https://your-api-host.example.com/api` |

Vite exposes `VITE_*` values in the browser bundle. Use this variable only for the public API URL; never put credentials or secrets in it. Development defaults to `http://localhost:5000/api`; production defaults to same-origin `/api` if the variable is omitted, so configure `VITE_API_URL` when frontend and backend are separate services.

`frontend/vercel.json` rewrites application routes to `index.html`, allowing React Router routes to load directly and survive refreshes. Vercel's static file handling serves built assets normally.

## PWA verification

The app links `manifest.webmanifest`, references 192×192 and 512×512 PNG icons, and registers `/sw.js` in production. Confirm the manifest and icons load over HTTPS, the service worker is active, and the browser offers installation. The service worker caches same-origin shell/assets and provides a limited navigation fallback; API calls and user data are not available offline, and there is no offline sync.

## Local verification

From the repository root, install dependencies separately in `backend` and `frontend` if needed. Run the API with `npm --prefix backend start` after setting backend variables, and run the Vite development server with `npm --prefix frontend run dev`. Check `http://localhost:5000/api/health` for database health. For push tests, use localhost or HTTPS and configure valid VAPID keys; permission alone does not enable Web Push delivery.
