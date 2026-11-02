# readAday Backend - Render Deployment Guide

This guide walks you through deploying the **readAday** production backend to [Render](https://render.com) using either the **Render Blueprint (1-Click)** or the **Manual Dashboard** setup.

---

## Architecture Overview on Render

```
                                      ┌─────────────────────────────────────┐
                                      │          Supabase Cloud             │
                                      │  - PostgreSQL 16 (Tables & Indexes) │
                                      │  - Row Level Security (RLS)         │
                                      │  - Supabase Auth (JWT & Roles)      │
                                      │  - Edge Functions                   │
                                      └──────────────────┬──────────────────┘
                                                         │
                                    Encrypted TLS Connection (DATABASE_URL / REST)
                                                         │
                                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Render Cloud Platform (https://render.com)                                             │
│                                                                                        │
│   ┌────────────────────────────────────────────────┐                                   │
│   │ Web Service: readaday-backend                  │                                   │
│   │ - Runtime: Node 22 (Express REST Engine)       │ ◄─── Incoming Frontend Traffic     │
│   │ - Port: 3000 (Auto-bound by Render)            │      (https://*.onrender.com)      │
│   │ - Health Check: /health                        │                                   │
│   │ - Feed Partitioning (Editorial/News/Community) │                                   │
│   │ - Rabbit Hole Discovery Graph Engine           │                                   │
│   └────────────────────────────────────────────────┘                                   │
│                                                                                        │
│   ┌────────────────────────────────────────────────┐  ┌──────────────────────────────┐ │
│   │ Render Cron: Scheduled Publisher               │  │ Render Cron: News Wire Ingest│ │
│   │ - Schedule: */5 * * * * (Every 5 mins)         │  │ - Schedule: */30 * * * *     │ │
│   │ - Command: npm run cron:publish                │  │ - Command: npm run cron:news │ │
│   └────────────────────────────────────────────────┘  └──────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

1. A free or paid account on [Render](https://render.com).
2. A free or paid project on [Supabase](https://supabase.com).
3. Your Git repository (GitHub or GitLab) containing this codebase.

---

## Step 1: Run PostgreSQL Migrations on Supabase

Before launching the backend on Render, initialize your database tables, indexes, and RLS policies in Supabase:

1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project and navigate to the **SQL Editor** tab (in the left sidebar).
3. Click **New Query**.
4. Open the file `/supabase/migrations/20261101000000_readaday_schema.sql` from this repository, copy the entire SQL content, paste it into the editor, and click **Run**.
5. *(Optional for testing)*: Open `/supabase/seed.sql`, paste it into the SQL editor, and click **Run** to load initial categories, topics, graph relationships, and sample articles.
6. Verify that all 15 tables appear under **Database $\rightarrow$ Tables** with **RLS enabled** (green shield badge).

---

## Step 2: Deployment Option A — 1-Click Render Blueprint (Recommended)

This repository includes a `render.yaml` file that automatically provisions the Web Service and two Cron Jobs simultaneously.

1. Push this repository to **GitHub** or **GitLab**.
2. Go to the [Render Dashboard](https://dashboard.render.com).
3. Click the **New +** button in the top right and select **Blueprint**.
4. Connect your Git repository.
5. Render will detect `render.yaml` and list the 3 resources:
   - `readaday-backend` (Web Service)
   - `readaday-scheduled-publisher` (Cron Job)
   - `readaday-news-ingestion` (Cron Job)
6. Under **Environment Variables**, fill in your Supabase credentials:
   - `SUPABASE_URL`: e.g. `https://your-project-ref.supabase.co`
   - `SUPABASE_ANON_KEY`: Your Supabase anon public key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role secret key
   - `DATABASE_URL`: Your Supabase PostgreSQL connection string
7. Click **Apply**.
8. Render will build and deploy your backend automatically!

---

## Step 3: Deployment Option B — Manual Setup via Render Dashboard

If you prefer configuring the Web Service manually:

1. Go to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** $\rightarrow$ **Web Service**.
3. Select your repository.
4. Configure the service settings:
   - **Name**: `readaday-backend`
   - **Region**: Choose the region closest to your Supabase database (e.g. `Oregon (US West)` or `Frankfurt (EU)`).
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm install --legacy-peer-deps && npm run build
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
   - **Plan**: `Starter` (or `Free`)

5. Expand **Advanced** and configure:
   - **Health Check Path**: `/health`
   - **Auto-Deploy**: `Yes`

6. Add the following **Environment Variables**:

| Variable Name | Required | Example / Description |
| :--- | :--- | :--- |
| `NODE_ENV` | Yes | `production` |
| `PORT` | Yes | `3000` (Render binds to this automatically) |
| `CORS_ORIGIN` | Yes | `*` (or your frontend domain, e.g. `https://readaday.com`) |
| `SUPABASE_URL` | Yes | `https://xyzcompany.supabase.co` (from Supabase Project Settings $\rightarrow$ API) |
| `SUPABASE_ANON_KEY` | Yes | `eyJhbGci...` (Supabase Anon Key) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | `eyJhbGci...` (Supabase Service Role Key) |
| `DATABASE_URL` | Optional | `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres` |
| `CRON_SECRET` | Yes | Any random 32-character string to secure manual webhook triggers |

7. Click **Create Web Service**.

---

## Step 4: Verify Deployment & Health Check

Once the deployment status turns green (**Live**):

1. **Test Health Endpoint**:
   ```bash
   curl -i https://your-service.onrender.com/health
   ```
   **Expected Response (HTTP 200)**:
   ```json
   {
     "status": "ok",
     "service": "readaday-backend",
     "uptimeSeconds": 142,
     "timestamp": "2026-11-01T17:20:00.000Z",
     "schedulerRunning": true
   }
   ```

2. **Test API Directory**:
   ```bash
   curl https://your-service.onrender.com/api
   ```

3. **Test Strict Feed Isolation (Editorial Feed)**:
   ```bash
   curl "https://your-service.onrender.com/api/articles?feed=editorial&limit=2"
   ```
   Inspect the response: `validationCheck.isContaminated` must be `false`.

4. **Test Rabbit Hole Discovery**:
   ```bash
   curl "https://your-service.onrender.com/api/discovery/rabbit-hole?articleId=art-ed-1&depth=3"
   ```

5. **Test RLS Policy Suite**:
   ```bash
   curl https://your-service.onrender.com/api/system/rls-test
   ```

---

## Step 5: Setting Up Scheduled Tasks & Background Workers on Render

readAday has two background jobs:
1. **Scheduled Article Release**: Automatically publishes articles when `scheduled_for <= now()`.
2. **News Ingestion & Deduplication**: Fetches RSS feeds, checks copyright rights, and ingests stories.

You have three options on Render:

### Approach 1: Built-in In-Process Worker (Zero Setup)
The backend includes an in-process worker (`scheduler.ts`) that starts automatically when `server.ts` launches. It checks scheduled releases every 30 seconds.

### Approach 2: Render Cron Jobs (Separate Background Processes)
If using Render Starter/Pro, configure dedicated Cron Jobs:

1. **Scheduled Publisher**:
   - In Render Dashboard, click **New +** $\rightarrow$ **Cron Job**.
   - **Command**: `npm run cron:publish`
   - **Schedule**: `*/5 * * * *` (Every 5 minutes)
2. **News RSS Ingestion**:
   - Click **New +** $\rightarrow$ **Cron Job**.
   - **Command**: `npm run cron:news`
   - **Schedule**: `*/30 * * * *` (Every 30 minutes)

### Approach 3: External Webhook Triggers (GitHub Actions / EasyCron)
Call the secured endpoints over HTTP:
```bash
curl -X POST https://your-service.onrender.com/api/system/scheduler/run-publish \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## Step 6: Frontend Integration with Render

In your frontend application (e.g. Next.js, React, Mobile app):

```typescript
// Configure API base URL
const BACKEND_API = process.env.NEXT_PUBLIC_API_URL || 'https://your-service.onrender.com';

// 1. Fetch strictly separated Editorial articles
export async function fetchEditorialFeed() {
  const res = await fetch(`${BACKEND_API}/api/articles?feed=editorial`);
  return await res.json();
}

// 2. Explore the Rabbit Hole
export async function fetchRabbitHole(articleId: string, depth = 3) {
  const res = await fetch(`${BACKEND_API}/api/discovery/rabbit-hole?articleId=${articleId}&depth=${depth}`);
  return await res.json();
}

// 3. Authenticated requests with User Token
export async function fetchUserHighlights(userToken: string) {
  const res = await fetch(`${BACKEND_API}/api/reader/highlights`, {
    headers: {
      'Authorization': `Bearer ${userToken}`,
    },
  });
  return await res.json();
}
```

---

## Step 7: Troubleshooting on Render

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **Build timeout** | Heavy node_modules caching | In Render Dashboard, click **Manual Deploy** $\rightarrow$ **Clear build cache & deploy**. |
| **Port binding error** | Hardcoded port | Ensure `PORT=3000` is read via `process.env.PORT` (already implemented in `server.ts`). |
| **CORS errors in browser** | Mismatched origin | Set `CORS_ORIGIN="https://yourfrontend.com"` or `"*"` in Render environment variables. |
| **Health check failure** | Incorrect health check path | Ensure the Health Check Path in Render Settings is `/health`. |
| **Database permission denied** | Supabase RLS misconfiguration | Confirm you applied `/supabase/migrations/20261101000000_readaday_schema.sql` with security definer functions. |
