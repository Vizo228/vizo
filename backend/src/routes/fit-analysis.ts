import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { findSessionUser, type SessionDatabase } from '../lib/session.js';
import { analyzeGarmentFit } from '../services/fit-analysis.js';

const measurements = z.object({
  chest: z.number().positive().max(250),
  waist: z.number().positive().max(250),
  hips: z.number().positive().max(250),
  shoulders: z.number().positive().max(100),
  sleeveLength: z.number().positive().max(150),
  torsoLength: z.number().positive().max(150)
}).strict();

const fitSchema = z.object({
  body: measurements,
  garment: measurements,
  stretch: z.object({
    horizontalPct: z.number().min(0).max(100),
    verticalPct: z.number().min(0).max(100)
  }).strict()
}).strict();

export function registerFitAnalysisRoutes(app: FastifyInstance, db: SessionDatabase): void {
  app.post('/api/try-on/fit-analysis', async (request, reply) => {
    const user = await findSessionUser(db, request);
    if (!user) {
      return reply.code(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Sign in is required' } });
    }
    const parsed = fitSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Provide valid body, garment and fabric measurements', details: parsed.error.flatten() } });
    }
    return reply.code(200).send({ fit: analyzeGarmentFit(parsed.data) });
  });
}
