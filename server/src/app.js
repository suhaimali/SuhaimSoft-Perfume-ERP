import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { config } from './config/env.js';
import apiRouter from './routes/api.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();

app.set('trust proxy', 1);

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin || config.clientUrls.includes(origin) || origin.startsWith('http://localhost:')) {
        return callback(null, true);
      }
      callback(null, true); // Dev-friendly permissive
    },
    credentials: true,
  })
);

app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (!config.isTest) {
  app.use(morgan('dev'));
}

// Rate limiting for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: { message: 'Too many requests, please try again later' } },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/v1/auth/login', authLimiter);

// Serve static uploads
app.use('/uploads', express.static(path.resolve(config.uploadDir)));

// Root check
app.get('/', (_req, res) => {
  res.json({
    brand: 'SuhaimSoft',
    product: 'Perfume Business Management ERP',
    tagline: 'Manage Every Fragrance. Control Every Sale.',
    version: '1.0.0',
    status: 'operational',
  });
});

// API Routes
app.use('/api/v1', apiRouter);

// 404 & Error handlers
app.use(notFound);
app.use(errorHandler);

export default app;
