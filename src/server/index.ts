import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'express-cors';
import dotenv from 'dotenv';
import logger from './logger';
import { PrismaClient } from '@prisma/client';

// Import routes
import analyticsRoutes from './routes/analytics';
import expensesRoutes from './routes/expenses';
import segmentsRoutes from './routes/segments';
import tripsRoutes from './routes/trips';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;
const prisma = new PrismaClient();

// Global middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/analytics', analyticsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/segments', segmentsRoutes);
app.use('/api/trips', tripsRoutes);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Error: ${err.message}`);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    status: err.status || 500,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`✓ Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
  });
  await prisma.$disconnect();
  process.exit(0);
});

export { app, prisma };
