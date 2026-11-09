import { createHash, randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

type DbRow = Record<string, unknown>;
export interface AuthDatabase {
  query: (text: string, values?: unknown[]) => Promise<{ rows: DbRow[]; rowCount: number | null }>;
}
const SESSION_DAYS = 30;
const registerSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
  displayName: z.string().trim().min(2).max(80),
  locale: z.enum(['kk', 'ru', 'en']).default('ru')
}).strict();
const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128)
}).strict();
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
function bearer(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return /^[A-Za-z0-9_-]{40,100}$/.test(token) ? token : null;
}
function publicUser(row: DbRow) {
  return { id: row.id, email: row.email, displayName: row.display_name, role: row.role, locale: row.preferred_locale };
}
async function issueSession(db: AuthDatabase, userId: string) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await db.query('INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [userId, digest(token), expiresAt]);
  return { token, expiresAt };
}
async function currentUser(db: AuthDatabase, request: FastifyRequest) {
  const token = bearer(request);
  if (!token) return null;
  const result = await db.query(
    'SELECT u.id, u.email, u.display_name, u.role, u.preferred_locale FROM auth_sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > NOW() AND s.revoked_at IS NULL AND u.status = \'active\' LIMIT 1',
    [digest(token)]
  );
  return result.rows[0] ?? null;
}
function invalid(reply: FastifyReply, details: unknown) {
  return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request data', details } });
}
export function registerAuthRoutes(app: FastifyInstance, db: AuthDatabase): void {
  app.post('/api/auth/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error.flatten());
    const input = parsed.data;
    const hash = await argon2.hash(input.password, { type: argon2.argon2id });
    try {
      const created = await db.query(
        'INSERT INTO users (email, password_hash, display_name, preferred_locale) VALUES (LOWER($1), $2, $3, $4) RETURNING id, email, display_name, role, preferred_locale',
        [input.email, hash, input.displayName, input.locale]
      );
      const user = created.rows[0];
      if (!user) throw new Error('User insert returned no row');
      const session = await issueSession(db, String(user.id));
      return reply.code(201).send({ user: publicUser(user), token: session.token, tokenType: 'Bearer', expiresAt: session.expiresAt.toISOString() });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
        return reply.code(409).send({ error: { code: 'EMAIL_ALREADY_EXISTS', message: 'An account with this email already exists' } });
      }
      throw error;
    }
  });
  app.post('/api/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) return invalid(reply, parsed.error.flatten());
    const result = await db.query(
      'SELECT id, email, password_hash, display_name, role, preferred_locale, status FROM users WHERE email = LOWER($1) LIMIT 1',
      [parsed.data.email]
    );
    const user = result.rows[0];
    const hash = user?.password_hash;
    const valid = typeof hash === 'string' ? await argon2.verify(hash, parsed.data.password).catch(() => false) : false;
    if (!user || !valid || user.status !== 'active') {
      return reply.code(401).send({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' } });
    }
    const session = await issueSession(db, String(user.id));
    return reply.code(200).send({ user: publicUser(user), token: session.token, tokenType: 'Bearer', expiresAt: session.expiresAt.toISOString() });
  });
  app.get('/api/auth/me', async (request, reply) => {
    const user = await currentUser(db, request);
    if (!user) return reply.code(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
    return reply.code(200).send({ user: publicUser(user) });
  });
  app.post('/api/auth/logout', async (request, reply) => {
    const token = bearer(request);
    if (!token) return reply.code(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
    await db.query('UPDATE auth_sessions SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL', [digest(token)]);
    return reply.code(204).send();
  });
}
