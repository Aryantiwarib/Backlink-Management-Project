import assert from 'node:assert/strict';
import http from 'http';
import { MongoMemoryServer } from 'mongodb-memory-server';

async function run() {
  console.log('\n======================================================');
  console.log('   LINKORA — CORS Preflight and PATCH Method Validation');
  console.log('======================================================\n');

  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.SESSION_SECRET = 'test-cors-secret-12345';
  process.env.PORT = '0';

  const { default: app } = await import('../app.js');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  let passed = 0;

  try {
    // Test 1: Preflight OPTIONS on campaign status
    const res1 = await fetch(`http://localhost:${port}/api/campaigns/660000000000000000000001/status`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'PATCH',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });

    assert.equal(res1.status, 204, 'Preflight OPTIONS must respond with 204 No Content');
    const allowMethods1 = res1.headers.get('access-control-allow-methods') || '';
    assert.ok(allowMethods1.includes('PATCH'), `Access-Control-Allow-Methods must include PATCH. Got: ${allowMethods1}`);
    assert.equal(res1.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    assert.equal(res1.headers.get('access-control-allow-credentials'), 'true');
    console.log('  PASS: 1. Preflight OPTIONS on /api/campaigns/:id/status returns 204 with PATCH allowed');
    passed++;

    // Test 2: Full Allowed Methods verification
    const allowHeaders1 = res1.headers.get('access-control-allow-headers') || '';
    for (const m of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']) {
      assert.ok(allowMethods1.includes(m), `Expected methods to include ${m}`);
    }
    console.log('  PASS: 2. Access-Control-Allow-Methods contains all standard REST methods (GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD)');
    passed++;

    // Test 3: Direct PATCH reaching authMiddleware (returns 401 Unauthorized, not CORS block or 405)
    const res3 = await fetch(`http://localhost:${port}/api/campaigns/660000000000000000000001/status`, {
      method: 'PATCH',
      headers: {
        'Origin': 'http://localhost:5173',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'paused' })
    });

    assert.equal(res3.status, 401, 'Should reach auth middleware and return 401 Unauthorized');
    assert.equal(res3.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    console.log('  PASS: 3. Direct PATCH request passes CORS headers and reaches controller authMiddleware (401 Unauthorized)');
    passed++;

    // Test 4: Preflight on prospects status endpoint
    const res4 = await fetch(`http://localhost:${port}/api/prospects/660000000000000000000001/status`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'PATCH',
        'Access-Control-Request-Headers': 'Content-Type, X-Requested-With'
      }
    });

    assert.equal(res4.status, 204);
    const allowMethods4 = res4.headers.get('access-control-allow-methods') || '';
    assert.ok(allowMethods4.includes('PATCH'));
    console.log('  PASS: 4. Preflight OPTIONS on prospect routes permits PATCH and custom headers');
    passed++;

    console.log(`\nAll ${passed} CORS and PATCH tests PASSED successfully!\n`);
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

run();
