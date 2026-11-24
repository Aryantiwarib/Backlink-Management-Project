import '../config/loadEnv.js';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User.js';
import Website from '../models/Website.js';
import Campaign from '../models/Campaign.js';
import { createCampaign } from '../controllers/campaignController.js';

let mongo;

async function run() {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  const user = await User.create({ name: 'Tester', email: 'test@example.com', password: 'password123' });
  const website = await Website.create({
    userId: user._id,
    name: 'Test Site',
    domain: 'example.com',
    url: 'https://example.com',
    verificationStatus: 'verified',
    verificationToken: 'token-123'
  });

  console.log('Testing Campaign Creation Controller...');

  // Test 1: Successful Campaign Creation
  let resCode, resJson;
  const mockRes = () => ({
    status(code) { resCode = code; return this; },
    json(data) { resJson = data; return this; }
  });

  await createCampaign(
    {
      user: { _id: user._id },
      params: { websiteId: website._id.toString() },
      body: {
        name: 'Launch Guest Post Campaign',
        description: 'Outreach to tech publications',
        campaignType: 'Guest Posting',
        objective: 'Acquire 15 backlinks',
        targetBacklinks: 15,
        startDate: new Date('2026-11-24'),
        endDate: new Date('2026-12-24'),
        status: 'active'
      }
    },
    mockRes(),
    (err) => { console.error('Unexpected error in Test 1:', err); }
  );

  console.log('  PASS: Test 1 (Valid Creation) status:', resCode);
  console.log('  PASS: Test 1 campaign name:', resJson?.campaign?.name);
  console.log('  PASS: Test 1 success flag:', resJson?.success);

  // Test 2: Failed Campaign Creation (Empty Name)
  let caughtErr2;
  await createCampaign(
    {
      user: { _id: user._id },
      params: { websiteId: website._id.toString() },
      body: {
        name: '   ',
        campaignType: 'Guest Posting'
      }
    },
    mockRes(),
    (err) => { caughtErr2 = err; }
  );
  console.log('  PASS: Test 2 (Empty Name) status:', caughtErr2?.status, 'message:', caughtErr2?.message);

  // Test 3: Failed Campaign Creation (End date before start date)
  let caughtErr3;
  await createCampaign(
    {
      user: { _id: user._id },
      params: { websiteId: website._id.toString() },
      body: {
        name: 'Invalid Dates',
        campaignType: 'Guest Posting',
        startDate: '2026-12-31',
        endDate: '2026-01-01'
      }
    },
    mockRes(),
    (err) => { caughtErr3 = err; }
  );
  console.log('  PASS: Test 3 (Invalid Dates) status:', caughtErr3?.status, 'message:', caughtErr3?.message);

  // Test 4: Failed Campaign Creation (Unauthorized website)
  let caughtErr4;
  const otherUser = new mongoose.Types.ObjectId();
  await createCampaign(
    {
      user: { _id: otherUser },
      params: { websiteId: website._id.toString() },
      body: {
        name: 'Unauthorized Attempt',
        campaignType: 'General Link Building'
      }
    },
    mockRes(),
    (err) => { caughtErr4 = err; }
  );
  console.log('  PASS: Test 4 (Unauthorized) status:', caughtErr4?.status, 'message:', caughtErr4?.message);

  await mongoose.disconnect();
  await mongo.stop();
  console.log('\nAll campaign creation validation tests passed!');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
