import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp, type Database } from '../src/app.js';
import type { AppEnv } from '../src/config/env.js';

const env: AppEnv = {
  NODE_ENV: 'test', HOST: '127.0.0.1', PORT: 3000, LOG_LEVEL: 'silent',
  DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:5432/unused',
  CORS_ORIGIN: 'http://localhost:5173'
};
const token = 'A'.repeat(43);
const headers = { authorization: `Bearer ${token}` };

function fakeDb(role: 'customer' | 'admin'): Database {
  return {
    query: async (sql: string) => {
      if (sql.includes('FROM auth_sessions')) {
        return { rows: [{ id: role === 'admin' ? 'admin-1' : 'customer-1', role, status: 'active' }], rowCount: 1 };
      }
      if (sql.includes('SELECT id FROM seller_applications')) return { rows: [], rowCount: 0 };
      if (sql.includes('INSERT INTO seller_applications')) {
        return { rows: [{ id: 'application-1', store_name: 'Test Store', status: 'pending' }], rowCount: 1 };
      }
      if (sql.includes('WITH reviewed AS')) {
        return { rows: [{ id: 'application-1', status: 'approved', promoted_count: 1 }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }
  };
}

test('seller application is created as pending for an authenticated customer', async () => {
  const app = buildApp(env, fakeDb('customer'));
  const response = await app.inject({
    method: 'POST', url: '/api/seller-applications', headers,
    payload: {
      storeName: 'Test Store', contactPhone: '+77001234567',
      description: 'We sell locally made clothes and want to join the VIZO marketplace.',
      resumeSummary: 'Five years of retail and customer service experience, including online orders.'
    }
  });
  assert.equal(response.statusCode, 201);
  assert.equal(response.json().application.status, 'pending');
  await app.close();
});

test('customer cannot read the administrator application queue', async () => {
  const app = buildApp(env, fakeDb('customer'));
  const response = await app.inject({ method: 'GET', url: '/api/admin/seller-applications', headers });
  assert.equal(response.statusCode, 403);
  assert.equal(response.json().error.code, 'ADMIN_REQUIRED');
  await app.close();
});

test('administrator can approve a pending application', async () => {
  const app = buildApp(env, fakeDb('admin'));
  const response = await app.inject({
    method: 'POST', url: '/api/admin/seller-applications/00000000-0000-4000-8000-000000000001/review',
    headers, payload: { decision: 'approved', note: 'Application verified' }
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().application.status, 'approved');
  await app.close();
});
