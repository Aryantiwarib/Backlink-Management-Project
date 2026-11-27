import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createAuthToken, verifyAuthToken } from '../utils/tokenHelper.js';
import { parseDateRange, calculateComparison } from '../services/analyticsService.js';

describe('LINKORA Core Unit Tests', () => {
  describe('Authentication & Token Helper (tokenHelper.js)', () => {
    const mockUser = {
      _id: '660000000000000000000001',
      email: 'founder@linkora.io',
      role: 'admin'
    };

    it('creates a signed token and verifies payload successfully', () => {
      const token = createAuthToken(mockUser);
      assert.ok(token && typeof token === 'string');
      assert.equal(token.split('.').length, 2);

      const payload = verifyAuthToken(token);
      assert.ok(payload);
      assert.equal(payload.id, mockUser._id);
      assert.equal(payload.email, mockUser.email);
      assert.equal(payload.role, mockUser.role);
      assert.ok(payload.exp > Date.now());
    });

    it('rejects tampered tokens with mismatched signature', () => {
      const token = createAuthToken(mockUser);
      const [payloadStr] = token.split('.');
      const forgedToken = `${payloadStr}.forgedSignature12345`;

      const payload = verifyAuthToken(forgedToken);
      assert.equal(payload, null);
    });

    it('rejects expired tokens', () => {
      // Create token that expired 1 second ago
      const expiredToken = createAuthToken(mockUser, -1000);
      const payload = verifyAuthToken(expiredToken);
      assert.equal(payload, null);
    });

    it('safely handles malformed input tokens without throwing', () => {
      assert.equal(verifyAuthToken(null), null);
      assert.equal(verifyAuthToken(''), null);
      assert.equal(verifyAuthToken('not-a-token'), null);
      assert.equal(verifyAuthToken(12345), null);
      assert.equal(verifyAuthToken({}), null);
    });
  });

  describe('Analytics Date & Comparison Utilities (analyticsService.js)', () => {
    it('parseDateRange correctly sets 30d range and comparative previous period', () => {
      const { current, previous, rangeLabel } = parseDateRange('30d');
      assert.equal(rangeLabel, '30d');
      assert.ok(current.startDate < current.endDate);
      assert.ok(previous.startDate < previous.endDate);
      assert.ok(previous.endDate.getTime() <= current.startDate.getTime() + 1000);
    });

    it('parseDateRange correctly sets 7d range duration', () => {
      const { current } = parseDateRange('7d');
      const diffDays = Math.round((current.endDate - current.startDate) / (1000 * 60 * 60 * 24));
      assert.equal(diffDays, 7);
    });

    it('calculateComparison calculates positive and negative percentage changes', () => {
      const growth = calculateComparison(150, 100);
      assert.equal(growth.percentChange, 50);
      assert.equal(growth.absoluteChange, 50);
      assert.equal(growth.isPositive, true);

      const decline = calculateComparison(80, 100);
      assert.equal(decline.percentChange, -20);
      assert.equal(decline.absoluteChange, -20);
      assert.equal(decline.isPositive, false);
    });

    it('calculateComparison safely avoids division by zero and null previous values', () => {
      const zeroBase = calculateComparison(50, 0);
      assert.equal(zeroBase.percentChange, null);
      assert.equal(zeroBase.absoluteChange, 50);
      assert.equal(zeroBase.hasComparison, false);

      const nullBase = calculateComparison(100, null);
      assert.equal(nullBase.percentChange, null);
      assert.equal(nullBase.status, 'first_record');
    });
  });
});
