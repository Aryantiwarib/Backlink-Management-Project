import assert from 'node:assert/strict';
import http from 'http';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import User from '../models/User.js';
import Website from '../models/Website.js';
import { createAuthToken } from '../utils/tokenHelper.js';

async function run() {
  console.log('\n======================================================');
  console.log('   LINKORA Phase 12: AI Assistant HTTP Route Tests    ');
  console.log('======================================================\n');

  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.SESSION_SECRET = 'test-ai-assistant-secret-12345';
  process.env.PORT = '0';

  const { default: app } = await import('../app.js');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  let passed = 0;

  try {
    // Seed test users
    const userA = await User.create({
      name: 'Alice Route Tester',
      email: 'alice_routes@linkora.io',
      password: 'password123'
    });

    const userB = await User.create({
      name: 'Bob Route Tester',
      email: 'bob_routes@linkora.io',
      password: 'password123'
    });

    const websiteA = await Website.create({
      userId: userA._id,
      name: 'Alice Brand',
      domain: 'alicebrand.com',
      url: 'https://alicebrand.com',
      verificationStatus: 'verified',
      verificationToken: 'token-alice-123',
      isActive: true
    });

    const tokenA = createAuthToken(userA);
    const tokenB = createAuthToken(userB);

    // 1. Unauthenticated requests are rejected with 401
    const unauthRes = await fetch(`http://localhost:${port}/api/assistant/conversations`);
    assert.equal(unauthRes.status, 401, 'Unauthenticated request must return 401');
    console.log('  PASS: 1. Unauthenticated GET /api/assistant/conversations returns 401');
    passed++;

    // 2. Authenticated user creates conversation
    const createRes = await fetch(`http://localhost:${port}/api/assistant/conversations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        websiteId: websiteA._id.toString(),
        title: 'Route Testing Chat'
      })
    });
    assert.equal(createRes.status, 201, 'Should create conversation with 201 Created');
    const createData = await createRes.json();
    assert.ok(createData.success);
    assert.equal(createData.conversation.title, 'Route Testing Chat');
    const convId = createData.conversation.id || createData.conversation._id;
    console.log('  PASS: 2. Authenticated POST /api/assistant/conversations creates conversation');
    passed++;

    // 3. List conversations for user A
    const listRes = await fetch(`http://localhost:${port}/api/assistant/conversations`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.equal(listRes.status, 200);
    const listData = await listRes.json();
    assert.equal(listData.conversations.length, 1);
    assert.equal(listData.conversations[0].id, convId);
    console.log('  PASS: 3. Authenticated GET /api/assistant/conversations lists user conversations');
    passed++;

    // 4. Get conversation by ID
    const getRes = await fetch(`http://localhost:${port}/api/assistant/conversations/${convId}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.equal(getRes.status, 200);
    const getData = await getRes.json();
    assert.equal(getData.conversation.id, convId);
    console.log('  PASS: 4. Authenticated GET /api/assistant/conversations/:id returns conversation');
    passed++;

    // 5. Cross-tenant protection: User B tries to access User A's conversation
    const userBAccessRes = await fetch(`http://localhost:${port}/api/assistant/conversations/${convId}`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert.equal(userBAccessRes.status, 404, 'User B must receive 404 when accessing User A conversation');
    console.log('  PASS: 5. Cross-tenant GET returns 404/Access Denied for other users');
    passed++;

    // 6. Send message to conversation (tests validation and fallback response without key)
    const sendMsgRes = await fetch(`http://localhost:${port}/api/assistant/conversations/${convId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: 'What is my current Domain Authority and backlink count?',
        websiteId: websiteA._id.toString()
      })
    });
    assert.equal(sendMsgRes.status, 200);
    const sendMsgData = await sendMsgRes.json();
    assert.ok(sendMsgData.success);
    assert.equal(sendMsgData.conversation.messages.length, 2); // 1 user + 1 assistant
    assert.equal(sendMsgData.conversation.messages[0].role, 'user');
    assert.equal(sendMsgData.conversation.messages[1].role, 'assistant');
    console.log('  PASS: 6. POST /api/assistant/conversations/:id/messages stores user prompt and assistant response');
    passed++;

    // 7. Clear conversation messages
    const clearRes = await fetch(`http://localhost:${port}/api/assistant/conversations/${convId}/messages`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.equal(clearRes.status, 200);
    const clearData = await clearRes.json();
    assert.equal(clearData.conversation.messages.length, 0);
    console.log('  PASS: 7. DELETE /api/assistant/conversations/:id/messages clears messages');
    passed++;

    // 8. Delete conversation
    const delRes = await fetch(`http://localhost:${port}/api/assistant/conversations/${convId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.equal(delRes.status, 200);

    const checkDelRes = await fetch(`http://localhost:${port}/api/assistant/conversations/${convId}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.equal(checkDelRes.status, 404);
    console.log('  PASS: 8. DELETE /api/assistant/conversations/:id completely deletes conversation');
    passed++;

    console.log(`\nAll ${passed} AI Assistant HTTP route tests PASSED successfully!\n`);
    server.close();
    await mongoose.disconnect();
    await mongod.stop();
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    server.close();
    await mongoose.disconnect();
    await mongod.stop();
    process.exit(1);
  }
}

run();
