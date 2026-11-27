import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';

describe('LINKORA REST API Integration Test Suite (Supertest)', () => {

  it('GET /api/health returns 200 OK with healthy status and metadata', async () => {
    const res = await request(app)
      .get('/api/health')
      .expect('Content-Type', /json/)
      .expect(200);

    assert.equal(res.body.status, 'healthy');
    assert.equal(res.body.service, 'Linkora Backend API');
    assert.equal(res.body.version, '1.0.0');
    assert.ok(typeof res.body.uptime === 'number');
    assert.ok(res.body.database === 'connected' || res.body.database === 'disconnected');
  });

  it('OPTIONS /api/campaigns/:id/status includes PATCH in Access-Control-Allow-Methods', async () => {
    const res = await request(app)
      .options('/api/campaigns/660000000000000000000001/status')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'PATCH')
      .expect(204);

    const allowedMethods = res.headers['access-control-allow-methods'] || '';
    assert.ok(allowedMethods.includes('PATCH'), `Expected PATCH in ${allowedMethods}`);
    assert.ok(allowedMethods.includes('GET'));
    assert.ok(allowedMethods.includes('POST'));
    assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:5173');
    assert.equal(res.headers['access-control-allow-credentials'], 'true');
  });

  it('GET /api/auth/status returns 200 with unauthenticated payload when unauthenticated', async () => {
    const res = await request(app)
      .get('/api/auth/status')
      .expect('Content-Type', /json/)
      .expect(200);

    assert.equal(res.body.success, true);
    assert.equal(res.body.isAuthenticated, false);
    assert.equal(res.body.user, null);
  });

  it('GET /api/campaigns requires authentication and responds with 401', async () => {
    const res = await request(app)
      .get('/api/campaigns')
      .expect(401);

    assert.equal(res.body.success, false);
    assert.ok(
      res.body.message.toLowerCase().includes('unauthorized') ||
      res.body.message.toLowerCase().includes('logged in')
    );
  });

  it('GET /api/websites requires authentication and responds with 401', async () => {
    const res = await request(app)
      .get('/api/websites')
      .expect(401);

    assert.equal(res.body.success, false);
  });

  it('GET /api/analytics/overview requires authentication and responds with 401', async () => {
    const res = await request(app)
      .get('/api/analytics/overview')
      .expect(401);

    assert.equal(res.body.success, false);
  });

  it('GET /api/assistant/history requires authentication and responds with 401', async () => {
    const res = await request(app)
      .get('/api/assistant/history')
      .expect(401);

    assert.equal(res.body.success, false);
  });

  it('GET /api/unknown-endpoint returns structured 404 response', async () => {
    const res = await request(app)
      .get('/api/unknown-endpoint-test-404')
      .expect(404);

    assert.equal(res.body.success, false);
    assert.ok(res.body.message.includes('API endpoint not found'));
  });
});
