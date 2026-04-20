import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { initDB } from './db/client';
import financeRoutes from './routes/finance';
import purchasesRoutes from './routes/purchases';
import bankRoutes from './routes/bank';
import insightsRoutes from './routes/insights';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/finance', financeRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/bank', bankRoutes);
app.use('/api/insights', insightsRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend if built
const publicPath = path.join(__dirname, '../public');
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
} else {
  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
}

// Error handler — preserves status codes set by middleware (400, 422, etc.)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack || err.message);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

async function start() {
  try {
    await initDB();
    console.log('Database initialized');
    const server = app.listen(PORT, () => {
      console.log(`Finance Wizz backend running on http://localhost:${PORT}`);
    });
    // Allow up to 10 minutes for AI-heavy requests (PDF parsing + categorization)
    server.timeout = 10 * 60 * 1000;
    server.keepAliveTimeout = 10 * 60 * 1000;
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
