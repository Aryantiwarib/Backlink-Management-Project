import mongoose from 'mongoose';
import Website from '../models/Website.js';
import { normalizeWebsiteInput } from './domainHelper.js';

/**
 * Helper to resolve and verify website ownership for the authenticated user.
 * Ensures strict multi-tenant authorization: a user cannot access or view
 * records belonging to another user.
 *
 * Checks:
 * 1. Explicit websiteId in query or body
 * 2. Explicit domain in query or body
 * 3. Active website flagged on the user account
 * 4. Most recently created website for the user
 *
 * @param {Object} req - Express request object with authenticated req.user
 * @returns {Promise<Document>} Mongoose Website document
 * @throws {Error} 400 or 404 with descriptive error message
 */
export async function resolveUserWebsite(req) {
  if (!req.user || !req.user._id) {
    const err = new Error('Authentication required to access website data.');
    err.status = 401;
    throw err;
  }

  const websiteId = req.query?.websiteId || req.body?.websiteId || req.params?.websiteId;
  const domain = req.query?.domain || req.body?.domain;

  // 1. By websiteId
  if (websiteId) {
    if (!mongoose.Types.ObjectId.isValid(websiteId)) {
      const err = new Error('Invalid website ID format.');
      err.status = 400;
      throw err;
    }

    const site = await Website.findOne({
      _id: websiteId,
      userId: req.user._id
    });

    if (!site) {
      const err = new Error('Website not found in your account or access denied.');
      err.status = 404;
      throw err;
    }

    return site;
  }

  // 2. By domain
  if (domain) {
    let normalizedDomain;
    try {
      const norm = normalizeWebsiteInput(domain);
      normalizedDomain = norm.domain;
    } catch (e) {
      const err = new Error('Invalid domain parameter format.');
      err.status = 400;
      throw err;
    }

    const site = await Website.findOne({
      domain: normalizedDomain,
      userId: req.user._id
    });

    if (!site) {
      const err = new Error(`Domain "${normalizedDomain}" is not registered in your account.`);
      err.status = 404;
      throw err;
    }

    return site;
  }

  // 3. Fallback to user's active website
  let activeSite = await Website.findOne({
    userId: req.user._id,
    isActive: true
  });

  if (!activeSite) {
    activeSite = await Website.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
  }

  if (!activeSite) {
    const err = new Error('No registered websites found in your account. Please add a website in Website Management first.');
    err.status = 400;
    throw err;
  }

  return activeSite;
}
