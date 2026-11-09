import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { Pool } from 'pg';
import type { AppEnv } from './config/env.js';
import { registerAuthRoutes, type AuthDatabase } from './routes/auth.js';
import { registerSellerApplicationRoutes } from './routes/seller-applications.js';
import { registerFitAnalysisRoutes } from './routes/fit-analysis.js';

export interface Database extends AuthDatabase { end?: () => Promise<void>; }

export function buildApp(env: AppEnv, database?: Database): FastifyInstance {
  const pool = database ?? new Pool({ connectionString: env.DATABASE_URL });
  const app = Fastify({ logger: { level: env.LOG_LEVEL } });
  const corsOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
  app.register(cors, { origin: corsOrigins, methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] });
  app.get('/health', async (_request, reply) => reply.code(200).send({
    status: 'ok', service: 'vizo-api', timestamp: new Date().toISOString()
  }));
  app.get('/ready', async (_request, reply) => {
    try { await pool.query('SELECT 1'); return reply.code(200).send({ status: 'ready', checks: { database: 'ok' } }); }
    catch { return reply.code(503).send({ status: 'not_ready', checks: { database: 'unavailable' } }); }
  });
  registerAuthRoutes(app, pool);
  registerSellerApplicationRoutes(app, pool);
  registerFitAnalysisRoutes(app, pool);
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({
    error: { code: 'NOT_FOUND', message: 'Route not found' }
  }));
  app.addHook('onClose', async () => { if (pool.end) await pool.end(); });
  return app;
}
