import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp, type Database } from '../src/app.js';
import type { AppEnv } from '../src/config/env.js';

const env: AppEnv = {
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: 3000,
  LOG_LEVEL: 'silent',
  DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:5432/unused',
  CORS_ORIGIN: 'http://localhost:5173'
};

test('GET /health returns service health without claiming database readiness', async () => {
  const db: Database = { query: async () => { throw new Error('must not be called'); } };
  const app = buildApp(env, db);
  const response = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().service, 'vizo-api');
  await app.close();
});

test('GET /ready reports database unavailable when the query fails', async () => {
  const db: Database = { query: async () => { throw new Error('database unavailable'); } };
  const app = buildApp(env, db);
  const response = await app.inject({ method: 'GET', url: '/ready' });
  assert.equal(response.statusCode, 503);
  assert.equal(response.json().status, 'not_ready');
  await app.close();
});

test('unknown routes return a stable 404 envelope', async () => {
  const db: Database = { query: async () => undefined };
  const app = buildApp(env, db);
  const response = await app.inject({ method: 'GET', url: '/does-not-exist' });
  assert.equal(response.statusCode, 404);
  assert.equal(response.json().error.code, 'NOT_FOUND');
  await app.close();
});
