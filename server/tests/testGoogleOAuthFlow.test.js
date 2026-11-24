import '../config/loadEnv.js';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User.js';
import ConnectedEmailAccount from '../models/ConnectedEmailAccount.js';
import { gmailService, GMAIL_SCOPES } from '../services/email/gmailService.js';
import {
  getGoogleAuthUrl,
  handleGoogleCallback,
  getAccountStatus,
  disconnectAccount
} from '../controllers/outreachController.js';
import outreachRouter from '../routes/outreachRoutes.js';

let mongoServer;

async function setup() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  console.log('Connected to In-Memory MongoDB test database');
}

async function teardown() {
  await mongoose.disconnect();
  await mongoServer.stop();
  console.log('Disconnected and stopped In-Memory MongoDB');
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   LINKORA Phase 11: Google OAuth Flow Verification   ');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Redirect URI Generation & Environment Fallbacks
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Redirect URI Verification ---');

    // Default configuration with PORT 5002
    const defaultUri = gmailService.getRedirectUri();
    assert(
      defaultUri === 'http://localhost:5002/api/outreach/connect/google/callback',
      'Redirect URI matches exact required: http://localhost:5002/api/outreach/connect/google/callback'
    );

    // Test custom override via GOOGLE_GMAIL_CALLBACK_URL
    const originalCallbackEnv = process.env.GOOGLE_GMAIL_CALLBACK_URL;
    process.env.GOOGLE_GMAIL_CALLBACK_URL = 'https://api.linkora.io/api/outreach/connect/google/callback';
    const overriddenUri = gmailService.getRedirectUri();
    assert(
      overriddenUri === 'https://api.linkora.io/api/outreach/connect/google/callback',
      'Supports explicit production callback URL via GOOGLE_GMAIL_CALLBACK_URL'
    );
    // Restore
    if (originalCallbackEnv) {
      process.env.GOOGLE_GMAIL_CALLBACK_URL = originalCallbackEnv;
    } else {
      delete process.env.GOOGLE_GMAIL_CALLBACK_URL;
    }

    // Test derivation from BACKEND_URL
    const originalBackendUrl = process.env.BACKEND_URL;
    const originalOutreachUri = process.env.GOOGLE_GMAIL_CALLBACK_URL;
    delete process.env.GOOGLE_GMAIL_CALLBACK_URL;
    delete process.env.GOOGLE_GMAIL_REDIRECT_URI;
    process.env.BACKEND_URL = 'https://production.linkora.app';
    const derivedProdUri = gmailService.getRedirectUri();
    assert(
      derivedProdUri === 'https://production.linkora.app/api/outreach/connect/google/callback',
      'Supports production callback URL derived from BACKEND_URL'
    );
    // Restore
    if (originalBackendUrl) process.env.BACKEND_URL = originalBackendUrl;
    else delete process.env.BACKEND_URL;
    if (originalOutreachUri) process.env.GOOGLE_GMAIL_CALLBACK_URL = originalOutreachUri;

    // -------------------------------------------------------------------------
    // TEST 2: Authorization URL Generation & Scopes
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Authorization URL & Scopes Verification ---');

    const testUserId = new mongoose.Types.ObjectId().toString();
    const authUrl = gmailService.generateAuthUrl(testUserId, '/outreach');
    assert(authUrl && typeof authUrl === 'string', 'generateAuthUrl returns a valid URL string');

    const parsedAuth = new URL(authUrl);
    assert(parsedAuth.origin === 'https://accounts.google.com', 'Auth URL points to accounts.google.com');
    assert(parsedAuth.searchParams.get('access_type') === 'offline', 'Requests access_type=offline for refresh tokens');
    assert(parsedAuth.searchParams.get('prompt') === 'consent', 'Requests prompt=consent to ensure refresh token issuance');
    assert(
      parsedAuth.searchParams.get('redirect_uri') === 'http://localhost:5002/api/outreach/connect/google/callback',
      'Auth URL contains exact redirect_uri parameter: http://localhost:5002/api/outreach/connect/google/callback'
    );

    // Verify all required Gmail & userinfo scopes are present
    const requestedScope = parsedAuth.searchParams.get('scope') || '';
    assert(requestedScope.includes('gmail.send'), 'Scope contains gmail.send');
    assert(requestedScope.includes('gmail.readonly'), 'Scope contains gmail.readonly');
    assert(requestedScope.includes('userinfo.email'), 'Scope contains userinfo.email');
    assert(requestedScope.includes('userinfo.profile'), 'Scope contains userinfo.profile');

    // Verify state encoding
    const stateStr = parsedAuth.searchParams.get('state');
    assert(stateStr !== null, 'State parameter is included');
    const parsedState = JSON.parse(stateStr);
    assert(parsedState.userId === testUserId, 'State encodes target userId');
    assert(parsedState.returnTo === '/outreach', 'State encodes returnTo path');

    // -------------------------------------------------------------------------
    // TEST 3: Initiation Controller (getGoogleAuthUrl)
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Initiation Controller & ReturnTo Handling ---');

    const testUser = await User.create({
      name: 'OAuth Test User',
      email: 'oauthtester@linkora.io',
      password: 'password123'
    });

    let authUrlResult = null;
    const mockReqInitiate = {
      user: testUser,
      query: { returnTo: '/campaigns/special-campaign-123' }
    };
    const mockResInitiate = {
      json: (data) => {
        authUrlResult = data;
      }
    };

    await getGoogleAuthUrl(mockReqInitiate, mockResInitiate, (err) => { throw err; });

    assert(authUrlResult?.success === true, 'getGoogleAuthUrl controller returns success: true');
    assert(authUrlResult?.authUrl?.includes('accounts.google.com'), 'Controller returns valid Google authUrl');
    const ctrlUrl = new URL(authUrlResult.authUrl);
    const ctrlState = JSON.parse(ctrlUrl.searchParams.get('state'));
    assert(ctrlState.returnTo === '/campaigns/special-campaign-123', 'Controller preserves custom returnTo in state');
    assert(ctrlState.userId === testUser._id.toString(), 'Controller preserves authenticated userId in state');

    // -------------------------------------------------------------------------
    // TEST 4: Callback Controller (handleGoogleCallback)
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Callback Controller Error & Success Redirects ---');

    // Helper to mock Express response redirect
    const createMockRes = () => {
      let redirectedTo = null;
      return {
        redirect: (url) => { redirectedTo = url; return this; },
        getRedirectedTo: () => redirectedTo
      };
    };

    // 4A: Google returns an error (e.g. user cancelled)
    const resErr = createMockRes();
    await handleGoogleCallback(
      {
        query: {
          error: 'access_denied',
          state: JSON.stringify({ userId: testUser._id.toString(), returnTo: '/outreach' })
        }
      },
      resErr,
      (err) => { throw err; }
    );

    const errUrl = resErr.getRedirectedTo();
    assert(errUrl && errUrl.includes('/outreach'), 'Redirects back to /outreach on error');
    assert(
      errUrl.includes('google_error=access_denied') && errUrl.includes('gmail_error=access_denied'),
      'Redirect URL contains google_error and gmail_error'
    );

    // 4B: Callback missing authorization code
    const resMissingCode = createMockRes();
    await handleGoogleCallback(
      {
        query: {
          state: JSON.stringify({ userId: testUser._id.toString(), returnTo: '/outreach' })
        }
      },
      resMissingCode,
      (err) => { throw err; }
    );
    const missingCodeUrl = resMissingCode.getRedirectedTo();
    assert(missingCodeUrl.includes('google_error'), 'Missing code redirects with error query param');

    // 4C: Callback missing userId and session
    const resNoUser = createMockRes();
    await handleGoogleCallback(
      {
        query: { code: 'some-code-123' },
        user: null
      },
      resNoUser,
      (err) => { throw err; }
    );
    const noUserUrl = resNoUser.getRedirectedTo();
    assert(noUserUrl.includes('/login'), 'Redirects to login if user cannot be identified');

    // -------------------------------------------------------------------------
    // TEST 5: Complete Code Exchange & Connected Account Persistence
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Code Exchange & Secure Token Storage ---');

    // Mock handleOAuthCallback to simulate Google OAuth token exchange
    let callbackCalledWith = null;
    const originalHandleCallback = gmailService.handleOAuthCallback;

    gmailService.handleOAuthCallback = async (code, userId) => {
      callbackCalledWith = { code, userId };

      const account = await ConnectedEmailAccount.findOneAndUpdate(
        { userId, provider: 'gmail' },
        {
          $set: {
            userId,
            email: 'outreach.verified@gmail.com',
            provider: 'gmail',
            accessToken: 'mock_encrypted_access_tok_12345',
            refreshToken: 'mock_encrypted_refresh_tok_67890',
            tokenExpiry: new Date(Date.now() + 3600 * 1000),
            scope: GMAIL_SCOPES,
            status: 'connected',
            metadata: {
              name: 'Verified Outreach Sender',
              picture: 'https://lh3.googleusercontent.com/test-pic'
            }
          }
        },
        { returnDocument: 'after', upsert: true }
      );
      return account.toSafeObject();
    };

    const resSuccess = createMockRes();
    await handleGoogleCallback(
      {
        query: {
          code: 'google-auth-code-valid-xyz',
          state: JSON.stringify({ userId: testUser._id.toString(), returnTo: '/campaigns/summer-2026' })
        }
      },
      resSuccess,
      (err) => { throw err; }
    );

    const successUrl = resSuccess.getRedirectedTo();
    assert(callbackCalledWith?.code === 'google-auth-code-valid-xyz', 'Code passed to handleOAuthCallback');
    assert(callbackCalledWith?.userId === testUser._id.toString(), 'User ID correctly extracted from state');
    assert(successUrl.includes('/campaigns/summer-2026'), 'Redirects back to custom returnTo path');
    assert(
      successUrl.includes('google_connected=true') && successUrl.includes('gmail_connected=true'),
      'Redirect URL sets google_connected=true and gmail_connected=true flags'
    );

    // Verify ConnectedEmailAccount persisted in MongoDB
    const persistedAccount = await ConnectedEmailAccount.findOne({
      userId: testUser._id,
      provider: 'gmail'
    });

    assert(persistedAccount !== null, 'ConnectedEmailAccount document created in MongoDB');
    assert(persistedAccount.email === 'outreach.verified@gmail.com', 'Stored email matches Google account');
    assert(persistedAccount.status === 'connected', 'Account status is connected');

    // Verify safe DTO doesn't expose tokens
    const safeObj = persistedAccount.toSafeObject();
    assert(!safeObj.accessToken && !safeObj.refreshToken, 'toSafeObject completely strips access and refresh tokens');

    // Restore original handler
    gmailService.handleOAuthCallback = originalHandleCallback;

    // -------------------------------------------------------------------------
    // TEST 6: Account Status & Disconnect Endpoints
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Account Status & Disconnect Verification ---');

    let statusJson = null;
    await getAccountStatus(
      { user: testUser },
      { json: (data) => { statusJson = data; } },
      (err) => { throw err; }
    );

    assert(statusJson?.connected === true, 'getAccountStatus reports connected: true');
    assert(statusJson?.account?.email === 'outreach.verified@gmail.com', 'Reports correct email address');
    assert(!statusJson?.account?.accessToken, 'getAccountStatus does not expose accessToken');
    assert(!statusJson?.account?.refreshToken, 'getAccountStatus does not expose refreshToken');

    // Disconnect Account
    let disconnectJson = null;
    await disconnectAccount(
      { user: testUser },
      { json: (data) => { disconnectJson = data; } },
      (err) => { throw err; }
    );

    assert(disconnectJson?.success === true, 'disconnectAccount returns success: true');
    const disconnectedDoc = await ConnectedEmailAccount.findOne({ userId: testUser._id });
    assert(disconnectedDoc.status === 'disconnected', 'Account status transitioned to disconnected');
    assert(!disconnectedDoc.accessToken && !disconnectedDoc.refreshToken, 'Tokens purged on disconnect');

    // -------------------------------------------------------------------------
    // TEST 7: Route Stack Parity
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Express Route Definition Parity ---');

    const routes = outreachRouter.stack
      .filter((layer) => layer.route)
      .map((layer) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods)
      }));

    const callbackRoute = routes.find((r) => r.path === '/connect/google/callback');
    assert(callbackRoute !== undefined, 'Route /connect/google/callback is defined in outreachRoutes');
    assert(callbackRoute.methods.includes('get'), 'Route /connect/google/callback handles GET requests');

    const connectRoute = routes.find((r) => r.path === '/connect/google');
    assert(connectRoute !== undefined, 'Route /connect/google is defined in outreachRoutes');
    assert(connectRoute.methods.includes('get'), 'Route /connect/google handles GET requests');

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n======================================================');
    console.log(`Google OAuth Verification: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during Google OAuth test execution:', err);
    process.exit(1);
  }
}

async function main() {
  await setup();
  try {
    await runTests();
  } finally {
    await teardown();
  }
}

main();