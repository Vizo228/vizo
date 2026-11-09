import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { findSessionUser, type SessionDatabase } from '../lib/session.js';

const applicationSchema = z.object({
  storeName: z.string().trim().min(2).max(120),
  legalName: z.string().trim().max(160).optional(),
  businessId: z.string().trim().max(32).optional(),
  contactPhone: z.string().trim().min(7).max(32),
  description: z.string().trim().min(30).max(3000),
  resumeSummary: z.string().trim().min(50).max(5000).optional(),
  resumeUrl: z.string().url().max(2048).refine((value) => value.startsWith('https://'), 'Resume URL must use HTTPS').optional(),
  portfolioUrl: z.string().url().max(2048).refine((value) => value.startsWith('https://'), 'Portfolio URL must use HTTPS').optional()
}).strict().refine((value) => Boolean(value.resumeSummary || value.resumeUrl), {
  message: 'Provide a resume summary or a secure HTTPS resume link'
});

const reviewSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  note: z.string().trim().max(2000).optional()
}).strict();

const listSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'withdrawn']).default('pending'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(10000).default(0)
});

function bearerRequired(reply: FastifyReply) {
  return reply.code(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Sign in is required' } });
}

async function requireUser(db: SessionDatabase, request: FastifyRequest) {
  return findSessionUser(db, request);
}

export function registerSellerApplicationRoutes(app: FastifyInstance, db: SessionDatabase): void {
  app.post('/api/seller-applications', async (request, reply) => {
    const user = await requireUser(db, request);
    if (!user) return bearerRequired(reply);
    if (user.role !== 'customer') {
      return reply.code(403).send({ error: { code: 'CUSTOMER_ACCOUNT_REQUIRED', message: 'Only a customer account can submit a seller application' } });
    }

    const parsed = applicationSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid application data', details: parsed.error.flatten() } });
    }

    const existing = await db.query(
      "SELECT id FROM seller_applications WHERE user_id = $1 AND status = 'pending' LIMIT 1",
      [user.id]
    );
    if (existing.rows[0]) {
      return reply.code(409).send({ error: { code: 'APPLICATION_ALREADY_PENDING', message: 'You already have a pending seller application' } });
    }

    const input = parsed.data;
    try {
      const created = await db.query(
        'INSERT INTO seller_applications (user_id, store_name, legal_name, business_id, contact_phone, description, resume_summary, resume_url, portfolio_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, store_name, status, created_at',
        [user.id, input.storeName, input.legalName ?? null, input.businessId ?? null, input.contactPhone, input.description, input.resumeSummary ?? null, input.resumeUrl ?? null, input.portfolioUrl ?? null]
      );
      return reply.code(201).send({ application: created.rows[0] });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
        return reply.code(409).send({ error: { code: 'APPLICATION_ALREADY_PENDING', message: 'You already have a pending seller application' } });
      }
      throw error;
    }
  });

  app.get('/api/seller-applications/me', async (request, reply) => {
    const user = await requireUser(db, request);
    if (!user) return bearerRequired(reply);
    const result = await db.query(
      'SELECT id, store_name, status, review_note, created_at, reviewed_at FROM seller_applications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [user.id]
    );
    return reply.code(200).send({ applications: result.rows });
  });

  app.get('/api/admin/seller-applications', async (request, reply) => {
    const user = await requireUser(db, request);
    if (!user) return bearerRequired(reply);
    if (user.role !== 'admin') {
      return reply.code(403).send({ error: { code: 'ADMIN_REQUIRED', message: 'Administrator permission is required' } });
    }
    const parsed = listSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters' } });
    }
    const { status, limit, offset } = parsed.data;
    const result = await db.query(
      'SELECT a.id, a.user_id, u.email, u.display_name, a.store_name, a.legal_name, a.business_id, a.contact_phone, a.description, a.resume_summary, a.resume_url, a.portfolio_url, a.status, a.created_at FROM seller_applications a JOIN users u ON u.id = a.user_id WHERE a.status = $1 ORDER BY a.created_at ASC LIMIT $2 OFFSET $3',
      [status, limit, offset]
    );
    return reply.code(200).send({ applications: result.rows, page: { status, limit, offset } });
  });

  app.post<{ Params: { id: string } }>('/api/admin/seller-applications/:id/review', async (request, reply) => {
    const user = await requireUser(db, request);
    if (!user) return bearerRequired(reply);
    if (user.role !== 'admin') {
      return reply.code(403).send({ error: { code: 'ADMIN_REQUIRED', message: 'Administrator permission is required' } });
    }
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const parsed = reviewSchema.safeParse(request.body);
    if (!params.success || !parsed.success) {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid review request' } });
    }

    const { decision, note } = parsed.data;
    const result = await db.query(
      `WITH reviewed AS (
        UPDATE seller_applications
        SET status = $2, reviewed_by = $3, reviewed_at = NOW(), review_note = $4
        WHERE id = $1 AND status = 'pending'
        RETURNING *
      ), profile AS (
        INSERT INTO seller_profiles (user_id, store_name, legal_name, business_id, contact_phone, description, status, reviewed_by, reviewed_at, review_note)
        SELECT user_id, store_name, legal_name, business_id, contact_phone, description, 'approved', $3, NOW(), $4
        FROM reviewed WHERE $2 = 'approved'
        ON CONFLICT (user_id) DO UPDATE SET
          store_name = EXCLUDED.store_name, legal_name = EXCLUDED.legal_name,
          business_id = EXCLUDED.business_id, contact_phone = EXCLUDED.contact_phone,
          description = EXCLUDED.description, status = 'approved',
          reviewed_by = EXCLUDED.reviewed_by, reviewed_at = EXCLUDED.reviewed_at,
          review_note = EXCLUDED.review_note, updated_at = NOW()
        RETURNING user_id
      ), promoted AS (
        UPDATE users SET role = 'seller', updated_at = NOW()
        WHERE id IN (SELECT user_id FROM profile)
        RETURNING id
      )
      SELECT reviewed.id, reviewed.user_id, reviewed.store_name, reviewed.status,
             reviewed.review_note, reviewed.reviewed_at,
             (SELECT COUNT(*)::int FROM promoted) AS promoted_count
      FROM reviewed`,
      [params.data.id, decision, user.id, note ?? null]
    );
    if (!result.rows[0]) {
      return reply.code(409).send({ error: { code: 'APPLICATION_NOT_PENDING', message: 'Application was not found or has already been reviewed' } });
    }
    return reply.code(200).send({ application: result.rows[0] });
  });
}
