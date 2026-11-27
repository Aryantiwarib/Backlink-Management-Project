import mongoose from 'mongoose';
import EmailDraft, { EMAIL_PURPOSES, EMAIL_TONES, EMAIL_LENGTHS } from '../models/EmailDraft.js';
import Prospect from '../models/Prospect.js';
import Campaign from '../models/Campaign.js';
import Website from '../models/Website.js';
import { generateOutreachEmail, modifyOutreachEmail } from '../services/aiEmailService.js';

/**
 * Validate that websiteId belongs to the authenticated user
 */
async function resolveWebsite(websiteId, userId) {
  if (!websiteId || !mongoose.Types.ObjectId.isValid(websiteId)) return null;
  return await Website.findOne({ _id: websiteId, userId });
}

/**
 * Generate fresh outreach email(s) or variations using AI
 * POST /api/ai-email/generate
 */
export async function generateEmail(req, res, next) {
  try {
    const userId = req.user._id;
    const {
      websiteId,
      prospectId,
      campaignId,
      recipientName = '',
      recipientWebsite = '',
      companyName = '',
      recipientEmail = '',
      emailPurpose = 'Backlink Request',
      tone = 'Professional',
      emailLength = 'Medium',
      customInstructions = '',
      senderName = '',
      variationsCount = 1
    } = req.body;

    // Validate Purpose, Tone, and Length
    if (emailPurpose && !EMAIL_PURPOSES.includes(emailPurpose)) {
      return res.status(400).json({
        success: false,
        message: `Invalid email purpose: "${emailPurpose}". Allowed values: ${EMAIL_PURPOSES.join(', ')}`
      });
    }

    if (tone && !EMAIL_TONES.includes(tone)) {
      return res.status(400).json({
        success: false,
        message: `Invalid tone: "${tone}". Allowed values: ${EMAIL_TONES.join(', ')}`
      });
    }

    if (emailLength && !EMAIL_LENGTHS.includes(emailLength)) {
      return res.status(400).json({
        success: false,
        message: `Invalid email length: "${emailLength}". Allowed values: ${EMAIL_LENGTHS.join(', ')}`
      });
    }

    // Resolve context entities safely
    let website = null;
    if (websiteId) {
      website = await resolveWebsite(websiteId, userId);
    }

    let prospect = null;
    if (prospectId && mongoose.Types.ObjectId.isValid(prospectId)) {
      prospect = await Prospect.findOne({ _id: prospectId, userId });
      if (!website && prospect?.websiteId) {
        website = await resolveWebsite(prospect.websiteId, userId);
      }
    }

    let campaign = null;
    if (campaignId && mongoose.Types.ObjectId.isValid(campaignId)) {
      campaign = await Campaign.findOne({ _id: campaignId, userId });
      if (!website && campaign?.websiteId) {
        website = await resolveWebsite(campaign.websiteId, userId);
      }
    }

    // Determine target recipient website from inputs or prospect
    const resolvedRecipientWebsite = (
      recipientWebsite ||
      prospect?.prospectDomain ||
      prospect?.prospectUrl ||
      companyName ||
      ''
    ).trim();

    const resolvedRecipientName = (
      recipientName ||
      prospect?.contactEmails?.[0]?.name ||
      ''
    ).trim();

    const resolvedRecipientEmail = (
      recipientEmail ||
      prospect?.contactEmail ||
      prospect?.contactEmails?.[0]?.email ||
      ''
    ).trim();

    const result = await generateOutreachEmail({
      recipientName: resolvedRecipientName,
      recipientWebsite: resolvedRecipientWebsite,
      companyName: companyName.trim(),
      recipientEmail: resolvedRecipientEmail,
      emailPurpose,
      tone,
      emailLength,
      customInstructions: (customInstructions || '').trim(),
      prospect,
      campaign,
      website,
      senderName: senderName || req.user.name || '',
      variationsCount: parseInt(variationsCount, 10) || 1
    });

    return res.json({
      success: true,
      ...result,
      metadata: {
        websiteId: website?._id?.toString() || null,
        prospectId: prospect?._id?.toString() || null,
        campaignId: campaign?._id?.toString() || null,
        emailPurpose,
        tone,
        emailLength
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Modify an existing email draft (tone, length, persuasion, CTA, custom prompt)
 * POST /api/ai-email/modify
 */
export async function modifyEmail(req, res, next) {
  try {
    const {
      currentSubject = '',
      currentBody = '',
      action = 'rewrite_email',
      tone = 'Professional',
      customInstructions = '',
      selectedText = '',
      targetField = 'both',
      websiteId,
      campaignId,
      prospectId
    } = req.body;

    if (!currentBody && !currentSubject) {
      return res.status(400).json({
        success: false,
        message: 'Current subject or body is required for modification.'
      });
    }

    const result = await modifyOutreachEmail({
      currentSubject,
      currentBody,
      action,
      tone,
      customInstructions: (customInstructions || '').trim(),
      selectedText: (selectedText || '').trim(),
      targetField,
      context: { websiteId, campaignId, prospectId }
    });

    return res.json({
      success: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Save or update an email draft with version tracking
 * POST /api/ai-email/drafts
 */
export async function saveDraft(req, res, next) {
  try {
    const userId = req.user._id;
    const {
      draftId,
      websiteId,
      prospectId,
      campaignId,
      recipientName,
      recipientWebsite,
      companyName,
      recipientEmail,
      emailPurpose,
      tone,
      emailLength,
      customInstructions,
      subject,
      body,
      variations = [],
      actionTaken = 'manual_save',
      status = 'draft'
    } = req.body;

    if (!websiteId || !mongoose.Types.ObjectId.isValid(websiteId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid website ID is required to save an outreach draft.'
      });
    }

    let draft = null;

    if (draftId && mongoose.Types.ObjectId.isValid(draftId)) {
      draft = await EmailDraft.findOne({ _id: draftId, userId });
    }

    if (draft) {
      // Update existing draft
      if (recipientName !== undefined) draft.recipientName = recipientName.trim();
      if (recipientWebsite !== undefined) draft.recipientWebsite = recipientWebsite.trim();
      if (companyName !== undefined) draft.companyName = companyName.trim();
      if (recipientEmail !== undefined) draft.recipientEmail = recipientEmail.trim();
      if (emailPurpose) draft.emailPurpose = emailPurpose;
      if (tone) draft.tone = tone;
      if (emailLength) draft.emailLength = emailLength;
      if (customInstructions !== undefined) draft.customInstructions = customInstructions.trim();
      if (prospectId) draft.prospectId = prospectId;
      if (campaignId) draft.campaignId = campaignId;
      if (status) draft.status = status;

      // Track revision if content changed
      if (subject !== undefined || body !== undefined) {
        draft.revisions.push({
          subject: draft.subject || '',
          body: draft.body || '',
          actionTaken
        });
        if (subject !== undefined) draft.subject = subject.trim();
        if (body !== undefined) draft.body = body.trim();
      }

      if (Array.isArray(variations) && variations.length > 0) {
        draft.variations = variations;
      }

      await draft.save();

      return res.json({
        success: true,
        message: 'Draft updated successfully.',
        draft: draft.toSafeObject()
      });
    }

    // Create new draft
    const newDraft = new EmailDraft({
      userId,
      websiteId,
      prospectId: prospectId && mongoose.Types.ObjectId.isValid(prospectId) ? prospectId : null,
      campaignId: campaignId && mongoose.Types.ObjectId.isValid(campaignId) ? campaignId : null,
      recipientName: (recipientName || '').trim(),
      recipientWebsite: (recipientWebsite || '').trim(),
      companyName: (companyName || '').trim(),
      recipientEmail: (recipientEmail || '').trim(),
      emailPurpose: emailPurpose || 'Backlink Request',
      tone: tone || 'Professional',
      emailLength: emailLength || 'Medium',
      customInstructions: (customInstructions || '').trim(),
      subject: (subject || '').trim(),
      body: (body || '').trim(),
      variations: Array.isArray(variations) ? variations : [],
      revisions: [
        {
          subject: (subject || '').trim(),
          body: (body || '').trim(),
          actionTaken: 'initial_creation'
        }
      ],
      status: status || 'draft'
    });

    await newDraft.save();

    return res.status(201).json({
      success: true,
      message: 'Draft saved successfully.',
      draft: newDraft.toSafeObject()
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List drafts with filtering
 * GET /api/ai-email/drafts
 */
export async function listDrafts(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId, prospectId, campaignId, status, limit = 50 } = req.query;

    const filter = { userId };
    if (websiteId && mongoose.Types.ObjectId.isValid(websiteId)) filter.websiteId = websiteId;
    if (prospectId && mongoose.Types.ObjectId.isValid(prospectId)) filter.prospectId = prospectId;
    if (campaignId && mongoose.Types.ObjectId.isValid(campaignId)) filter.campaignId = campaignId;
    if (status) filter.status = status;

    const drafts = await EmailDraft.find(filter)
      .sort({ updatedAt: -1 })
      .limit(Math.min(100, parseInt(limit, 10) || 50));

    return res.json({
      success: true,
      count: drafts.length,
      drafts: drafts.map((d) => d.toSafeObject())
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get single draft by ID
 * GET /api/ai-email/drafts/:draftId
 */
export async function getDraft(req, res, next) {
  try {
    const userId = req.user._id;
    const { draftId } = req.params;

    if (!draftId || !mongoose.Types.ObjectId.isValid(draftId)) {
      return res.status(400).json({ success: false, message: 'Invalid draft ID format.' });
    }

    const draft = await EmailDraft.findOne({ _id: draftId, userId });
    if (!draft) {
      return res.status(404).json({ success: false, message: 'Draft not found.' });
    }

    return res.json({
      success: true,
      draft: draft.toSafeObject()
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a draft
 * DELETE /api/ai-email/drafts/:draftId
 */
export async function deleteDraft(req, res, next) {
  try {
    const userId = req.user._id;
    const { draftId } = req.params;

    if (!draftId || !mongoose.Types.ObjectId.isValid(draftId)) {
      return res.status(400).json({ success: false, message: 'Invalid draft ID format.' });
    }

    const deleted = await EmailDraft.findOneAndDelete({ _id: draftId, userId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Draft not found.' });
    }

    return res.json({
      success: true,
      message: 'Draft discarded successfully.'
    });
  } catch (err) {
    next(err);
  }
}
