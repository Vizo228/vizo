import { createHash } from 'node:crypto';
import type { FastifyRequest } from 'fastify';

export type SessionRow = Record<string, unknown>;
export interface SessionDatabase {
  query: (text: string, values?: unknown[]) => Promise<{ rows: SessionRow[]; rowCount: number | null }>;
}

function tokenFrom(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return /^[A-Za-z0-9_-]{40,100}$/.test(token) ? token : null;
}

export async function findSessionUser(db: SessionDatabase, request: FastifyRequest): Promise<SessionRow | null> {
  const token = tokenFrom(request);
  if (!token) return null;
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const result = await db.query(
    "SELECT u.id, u.email, u.display_name, u.role, u.status FROM auth_sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > NOW() AND s.revoked_at IS NULL AND u.status = 'active' LIMIT 1",
    [tokenHash]
  );
  return result.rows[0] ?? null;
}
