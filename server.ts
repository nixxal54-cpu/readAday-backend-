/**
 * readAday Full-Stack Server
 * Express Backend on Port 3000 with Vite middleware in Dev
 */

import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './src/backend/apiRouter.ts';
import { scheduler } from './src/backend/scheduler.ts';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS & Security Headers
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-readaday-user-id');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Health Check Endpoint (Render Web Service health check path)
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'readaday-backend',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    schedulerRunning: scheduler.getStatus().isRunning,
  });
});

// API Directory Endpoint
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    platform: 'readAday Backend Engine',
    version: '1.0.0',
    documentation: '/api/system/schema',
    endpoints: {
      auth: ['/api/auth/me', '/api/auth/profile', '/api/auth/switch-role', '/api/auth/users'],
      content: ['/api/articles?feed=editorial|news|community', '/api/articles/:id', '/api/articles/:id/workflow'],
      editorial: ['/api/editorial/dashboard', '/api/editorial/featured', '/api/editorial/collections'],
      newsEngine: ['/api/news/sources', '/api/news/ingest'],
      community: ['/api/community/apply-writer', '/api/community/applications', '/api/community/reports'],
      reader: ['/api/reader/bookmarks', '/api/reader/history', '/api/reader/highlights', '/api/reader/collections'],
      discovery: ['/api/discovery/rabbit-hole', '/api/discovery/recommendations', '/api/discovery/topics'],
      system: ['/health', '/api/system/schema', '/api/system/rls-test', '/api/system/scheduler'],
    },
  });
});

// API Routes
app.use('/api', apiRouter);

// Start Background Ingestion & Scheduled Publishing Workers
scheduler.start();

// Mount Vite middleware in development or serve static in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[readAday Server] API and Discovery Platform ready at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[readAday Server] Startup failure:', err);
  process.exit(1);
});
