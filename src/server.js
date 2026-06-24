/**
 * HopeFusion Africa — Core Server Entrypoint
 * Refactored modular version.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { attachSocketIO } from './realtime.js';

// Shared database, Redis, and schema configurations
import { db, redis } from './config/db.js';
import passport from 'passport';
import './config/passport.js';

export { SCHEMA } from './config/schema.js';
export { db, redis };

// Route modules
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import { startupsRouter, investorsRouter, matchesRouter } from './routes/startups.js';
import grantsRouter from './routes/grants.js';
import servicesRouter from './routes/services.js';
import aiRouter from './routes/ai.js';
import { initAgent } from './services/agent.js';
import paymentsRouter from './routes/payments.js';
import pushRouter from './routes/push.js';
import workspaceRouter from './routes/workspace.js';
import opportunitiesRouter from './routes/opportunities.js';
import impactRouter from './routes/impact.js';
import governmentRouter from './routes/government.js';
import corporateRouter from './routes/corporate.js';
import syndicateRouter from './routes/syndicate.js';
import telephonyRouter from './routes/telephony.js';
import { validateEnv } from './scripts/validate-env.js';

dotenv.config();
validateEnv();

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'https://hopefusionafrica.com',
  'https://www.hopefusionafrica.com',
  process.env.FRONTEND_URL,
  'https://hopefusion-africa.vercel.app'
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.includes(origin) || 
                      origin === process.env.FRONTEND_URL ||
                      origin.endsWith('.vercel.app') ||
                      /^https:\/\/hopefusion-africa.*\.vercel\.app$/.test(origin);
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

const app = express();
const httpServer = createServer(app);

// ✅ Unified WebRTC + messaging socket server (shared db/redis pools)
const io = attachSocketIO(httpServer, corsOptions);

// Expose io instance to Express routes
app.set('io', io);

/* ============================================================
   MIDDLEWARE & ROUTING
   ============================================================ */

app.use(helmet());
app.use(cors(corsOptions));

// Raw parser for webhooks BEFORE express.json()
app.use('/api/v1/payments/paystack/webhook', express.raw({ type: 'application/json' }));
app.use('/api/v1/payments/flutterwave/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));
app.use(passport.initialize());

// Versioned APIs
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/startups', startupsRouter);
app.use('/api/v1/investors', investorsRouter);
app.use('/api/v1/matches', matchesRouter);
app.use('/api/v1/grants', grantsRouter);
app.use('/api/v1/ai', aiRouter);
app.use('/api/v1/payments', paymentsRouter);
app.use('/api/v1/push', pushRouter);
app.use('/api/v1/opportunities', opportunitiesRouter);
app.use('/api/v1/impact', impactRouter);
app.use('/api/v1/government', governmentRouter);
app.use('/api/v1/corporate', corporateRouter);
app.use('/api/v1/syndicate', syndicateRouter);
app.use('/api/v1/telephony', telephonyRouter);
app.use('/api/v1', workspaceRouter);

// Secondary Services (Sessions, Messages, Notifications, Health, Analytics)
app.use('/api/v1', servicesRouter);

/* ============================================================
   ERROR HANDLING
   ============================================================ */

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }));

const PORT = process.env.PORT || 3000;
if (process.env.NO_LISTEN !== 'true' && process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    console.log(`HopeFusion Backend running on port ${PORT}`);
    initAgent(io);
  });
}

export { app, httpServer };
