import crypto from 'crypto';
import dns from 'dns/promises';
import mongoose from 'mongoose';
import Website from '../models/Website.js';
import { normalizeWebsiteInput } from '../utils/domainHelper.js';

/**
 * Add a new website
 * POST /api/websites
 */
export const createWebsite = async (req, res) => {
  try {
    const { name, url, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Website name is required.'
      });
    }

    if (!url || !url.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Website URL or domain is required.'
      });
    }

    // Normalize and extract domain
    let normalized;
    try {
      normalized = normalizeWebsiteInput(url);
    } catch (normError) {
      return res.status(400).json({
        success: false,
        message: normError.message
      });
    }

    const { domain, url: cleanUrl } = normalized;

    // Check for duplicate domain under the same user
    const existing = await Website.findOne({
      userId: req.user._id,
      domain
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `The domain "${domain}" is already registered in your account.`
      });
    }

    // Generate unique verification token
    const token = `linkora_${crypto.randomBytes(16).toString('hex')}`;

    // If user has no existing websites, make this one active by default
    const existingCount = await Website.countDocuments({ userId: req.user._id });
    const isActive = existingCount === 0;

    const website = new Website({
      userId: req.user._id,
      name: name.trim(),
      domain,
      url: cleanUrl,
      description: description ? description.trim() : '',
      verificationStatus: 'pending',
      verificationToken: token,
      verificationMethod: 'DNS TXT',
      verifiedAt: null,
      isActive
    });

    await website.save();

    return res.status(201).json({
      success: true,
      message: 'Website added successfully. Please verify your domain ownership.',
      data: website.toSafeObject(true)
    });
  } catch (error) {
    console.error('Error creating website:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add website.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all websites for authenticated user
 * GET /api/websites
 */
export const getWebsites = async (req, res) => {
  try {
    const websites = await Website.find({ userId: req.user._id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: websites.length,
      data: websites.map((w) => w.toSafeObject(false))
    });
  } catch (error) {
    console.error('Error fetching websites:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve websites.'
    });
  }
};

/**
 * Get active website for authenticated user
 * GET /api/websites/active
 */
export const getActiveWebsite = async (req, res) => {
  try {
    let activeWebsite = await Website.findOne({
      userId: req.user._id,
      isActive: true
    });

    // If none active but user has websites, set the most recent one active
    if (!activeWebsite) {
      activeWebsite = await Website.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
      if (activeWebsite) {
        activeWebsite.isActive = true;
        await activeWebsite.save();
      }
    }

    return res.status(200).json({
      success: true,
      data: activeWebsite ? activeWebsite.toSafeObject(false) : null
    });
  } catch (error) {
    console.error('Error fetching active website:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch active website.'
    });
  }
};

/**
 * Get single website details with verification record info
 * GET /api/websites/:id
 */
export const getWebsiteById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid website ID.'
      });
    }

    const website = await Website.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!website) {
      return res.status(404).json({
        success: false,
        message: 'Website not found or access denied.'
      });
    }

    return res.status(200).json({
      success: true,
      data: website.toSafeObject(true)
    });
  } catch (error) {
    console.error('Error fetching website by ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch website details.'
    });
  }
};

/**
 * Update website details
 * PUT /api/websites/:id
 */
export const updateWebsite = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, url, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid website ID.'
      });
    }

    const website = await Website.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!website) {
      return res.status(404).json({
        success: false,
        message: 'Website not found or access denied.'
      });
    }

    if (name && name.trim()) {
      website.name = name.trim();
    }

    if (description !== undefined) {
      website.description = description ? description.trim() : '';
    }

    // If URL is updated, re-normalize and check if domain changed
    if (url && url.trim()) {
      try {
        const normalized = normalizeWebsiteInput(url);
        if (normalized.domain !== website.domain) {
          // Check if user already has this new domain
          const conflict = await Website.findOne({
            userId: req.user._id,
            domain: normalized.domain,
            _id: { $ne: website._id }
          });

          if (conflict) {
            return res.status(409).json({
              success: false,
              message: `The domain "${normalized.domain}" is already registered in your account.`
            });
          }

          // Reset verification status if domain changed
          website.domain = normalized.domain;
          website.url = normalized.url;
          website.verificationStatus = 'pending';
          website.verifiedAt = null;
          website.verificationToken = `linkora_${crypto.randomBytes(16).toString('hex')}`;
        } else {
          website.url = normalized.url;
        }
      } catch (normError) {
        return res.status(400).json({
          success: false,
          message: normError.message
        });
      }
    }

    await website.save();

    return res.status(200).json({
      success: true,
      message: 'Website updated successfully.',
      data: website.toSafeObject(true)
    });
  } catch (error) {
    console.error('Error updating website:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update website.'
    });
  }
};

/**
 * Delete website
 * DELETE /api/websites/:id
 */
export const deleteWebsite = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid website ID.'
      });
    }

    const website = await Website.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!website) {
      return res.status(404).json({
        success: false,
        message: 'Website not found or access denied.'
      });
    }

    const wasActive = website.isActive;
    await website.deleteOne();

    // If deleted website was active, select the next available one
    let nextActive = null;
    if (wasActive) {
      nextActive = await Website.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
      if (nextActive) {
        nextActive.isActive = true;
        await nextActive.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: `Website "${website.domain}" has been deleted.`,
      nextActiveWebsite: nextActive ? nextActive.toSafeObject(false) : null
    });
  } catch (error) {
    console.error('Error deleting website:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete website.'
    });
  }
};

/**
 * Set a website as active workspace
 * PUT /api/websites/:id/active
 */
export const setActiveWebsite = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid website ID.'
      });
    }

    const website = await Website.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!website) {
      return res.status(404).json({
        success: false,
        message: 'Website not found or access denied.'
      });
    }

    // Set all other websites for this user to inactive
    await Website.updateMany(
      { userId: req.user._id, _id: { $ne: website._id } },
      { $set: { isActive: false } }
    );

    website.isActive = true;
    await website.save();

    return res.status(200).json({
      success: true,
      message: `Active workspace switched to "${website.domain}".`,
      data: website.toSafeObject(false)
    });
  } catch (error) {
    console.error('Error setting active website:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to set active website.'
    });
  }
};

/**
 * Verify domain ownership using real DNS TXT query
 * POST /api/websites/:id/verify
 */
export const verifyDomain = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid website ID.'
      });
    }

    const website = await Website.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!website) {
      return res.status(404).json({
        success: false,
        message: 'Website not found or access denied.'
      });
    }

    if (website.verificationStatus === 'verified') {
      return res.status(200).json({
        success: true,
        message: 'Domain is already verified.',
        data: website.toSafeObject(true)
      });
    }

    const expectedHost = `_linkora-verification.${website.domain}`;
    const expectedValue = `linkora-verification=${website.verificationToken}`;
    const tokenOnly = website.verificationToken;

    // Collect all TXT records from both subdomain and root domain
    const foundRecords = [];
    let lookupSuccess = false;

    // Lookup 1: Dedicated verification subdomain
    try {
      const records1 = await dns.resolveTxt(expectedHost);
      const flattened1 = records1.map((chunk) => chunk.join(''));
      foundRecords.push(...flattened1);
    } catch (err1) {
      // Ignore ENOTFOUND / ENODATA, continue to root fallback
    }

    // Lookup 2: Fallback on root domain in case user added TXT to apex
    try {
      const records2 = await dns.resolveTxt(website.domain);
      const flattened2 = records2.map((chunk) => chunk.join(''));
      foundRecords.push(...flattened2);
    } catch (err2) {
      // Ignore
    }

    // Check if any TXT record matches
    const matched = foundRecords.some((rec) => {
      const clean = rec.trim();
      return (
        clean === expectedValue ||
        clean === tokenOnly ||
        clean.includes(expectedValue) ||
        clean.includes(tokenOnly)
      );
    });

    if (matched) {
      website.verificationStatus = 'verified';
      website.verifiedAt = new Date();
      await website.save();

      return res.status(200).json({
        success: true,
        message: `Domain ${website.domain} verified successfully! Ownership has been confirmed.`,
        data: website.toSafeObject(true)
      });
    }

    // If record not found or doesn't match
    return res.status(400).json({
      success: false,
      message: `DNS TXT record not found for "${website.domain}".`,
      details: {
        host: expectedHost,
        expectedValue,
        recordsFound: foundRecords.length > 0 ? foundRecords.slice(0, 5) : ['No TXT records found'],
        tip: 'DNS changes typically propagate within a few minutes, but can take up to 24-48 hours depending on TTL and DNS provider. Please check your DNS settings and retry.'
      }
    });
  } catch (error) {
    console.error('Error during domain verification:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while querying DNS. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
