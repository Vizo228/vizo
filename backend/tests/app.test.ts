import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp, type Database } from '../src/app.js';
import type { AppEnv } from '../src/config/env.js';
const env: AppEnv = { NODE_ENV: 'test', HOST: '127.0.0.1', PORT: 3000, LOG_LEVEL: 'silent', DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:5432/unused', CORS_ORIGIN: 'http://localhost:5173' };
test('health endpoint responds without querying database', async () => {
  const db: Database = { query: async () => { throw new Error('must not be called'); } };
  const app = buildApp(env, db); const response = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(response.statusCode, 200); assert.equal(response.json().service, 'vizo-api'); await app.close();
});
test('readiness reports database unavailable on query failure', async () => {
  const db: Database = { query: async () => { throw new Error('database unavailable'); } };
  const app = buildApp(env, db); const response = await app.inject({ method: 'GET', url: '/ready' });
  assert.equal(response.statusCode, 503); assert.equal(response.json().status, 'not_ready'); await app.close();
});
test('registration rejects weak passwords and client-selected roles', async () => {
  const db: Database = { query: async () => ({ rows: [], rowCount: 0 }) };
  const app = buildApp(env, db);
  const weak = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: 'user@example.com', password: 'short', displayName: 'Test' } });
  assert.equal(weak.statusCode, 400);
  const role = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: 'user@example.com', password: 'long-enough-password', displayName: 'Test', role: 'admin' } });
  assert.equal(role.statusCode, 400); await app.close();
});
test('unknown routes return stable 404 envelope', async () => {
  const db: Database = { query: async () => ({ rows: [], rowCount: 0 }) };
  const app = buildApp(env, db); const response = await app.inject({ method: 'GET', url: '/does-not-exist' });
  assert.equal(response.statusCode, 404); assert.equal(response.json().error.code, 'NOT_FOUND'); await app.close();
});

test('CORS preflight allows configured frontend origin and bearer headers', async () => {
  const db: Database = { query: async () => ({ rows: [], rowCount: 0 }) };
  const app = buildApp(env, db);
  const response = await app.inject({
    method: 'OPTIONS',
    url: '/api/auth/login',
    headers: {
      origin: 'http://localhost:5173',
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'authorization,content-type'
    }
  });
  assert.equal(response.statusCode, 204);
  assert.equal(response.headers['access-control-allow-origin'], 'http://localhost:5173');
  assert.match(String(response.headers['access-control-allow-headers']), /authorization/i);
  await app.close();
});
