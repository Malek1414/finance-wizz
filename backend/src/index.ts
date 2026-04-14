import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  try {
    await initDB();
    console.log('Database initialized');
    app.listen(PORT, () => {
      console.log(`Finance Wizz backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
