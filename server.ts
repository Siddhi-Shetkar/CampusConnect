import 'dotenv/config';
import http from 'http';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { closeDatabase, getDatabaseMode, initializeDatabase } from './server/db/database.ts';
import { initializeSocketServer } from './server/realtime/socket.ts';
import { authRouter } from './server/routes/auth.ts';
import { usersRouter } from './server/routes/users.ts';
import { requestsRouter } from './server/routes/requests.ts';
import { connectionsRouter } from './server/routes/connections.ts';
import { messagesRouter } from './server/routes/messages.ts';
import { notificationsRouter } from './server/routes/notifications.ts';

async function startServer() {
  await initializeDatabase();

  const app = express();
  const httpServer = http.createServer(app);
  const PORT = Number(process.env.PORT || 3000);

  // Attach real-time Socket.IO server on the same HTTP server (port 3000)
  initializeSocketServer(httpServer);

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '256kb' }));

  // Ensure service worker is never aggressively cached
  app.use('/sw.js', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Service-Worker-Allowed', '/');
    next();
  });

  // API routes
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, database: getDatabaseMode() });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/requests', requestsRouter);
  app.use('/api/connections', connectionsRouter);
  app.use('/api/messages', messagesRouter);
  app.use('/api/notifications', notificationsRouter);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`CampusConnect server (HTTP + Socket.IO) running on http://0.0.0.0:${PORT}`);
  });

  const shutdown = async () => {
    console.log('Shutting down server gracefully...');
    httpServer.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start CampusConnect server:', err);
  process.exit(1);
});
