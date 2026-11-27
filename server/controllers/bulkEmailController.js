import Website from '../models/Website.js';
import Campaign from '../models/Campaign.js';
import {
  generateCommonTemplate,
  modifyCommonTemplate,
  personalizeForProspect,
  sendBulkEmails,
  retrySingleEmail,
  BULK_EMAIL_PURPOSES,
  BULK_EMAIL_TONES,
  BULK_EMAIL_LENGTHS
} from '../services/bulkEmailService.js';

/**
 * Generate ONE common outreach email template with dynamic placeholders
 * POST /api/outreach/bulk/template/generate
 */
export async function generateTemplate(req, res, next) {
  try {
    const userId = req.user._id;
    const {
      purpose = 'Backlink Request',
      tone = 'Professional',
      length = 'Medium',
      customInstructions = '',
      websiteId,
      campaignId,
      senderName = ''
    } = req.body;

    // Validate inputs
    if (purpose && !BULK_EMAIL_PURPOSES.includes(purpose)) {
      return res.status(400).json({
        success: false,
        message: `Invalid email purpose: "${purpose}". Allowed: ${BULK_EMAIL_PURPOSES.join(', ')}`
      });
    }

    if (tone && !BULK_EMAIL_TONES.includes(tone)) {
      return res.status(400).json({
        success: false,
        message: `Invalid tone: "${tone}". Allowed: ${BULK_EMAIL_TONES.join(', ')}`
      });
    }

    if (length && !BULK_EMAIL_LENGTHS.includes(length)) {
      return res.status(400).json({
        success: false,
        message: `Invalid length: "${length}". Allowed: ${BULK_EMAIL_LENGTHS.join(', ')}`
      });
    }

    // Resolve user website domain if websiteId provided
    let yourWebsite = '';
    if (websiteId) {
      const website = await Website.findOne({ _id: websiteId, userId });
      if (website) {
        yourWebsite = website.domain || website.name || '';
      }
    }

    let campaignName = '';
    if (campaignId) {
      const campaign = await Campaign.findOne({ _id: campaignId, userId });
      if (campaign) {
        campaignName = campaign.name || '';
        if (!yourWebsite && campaign.websiteId) {
          const w = await Website.findOne({ _id: campaign.websiteId, userId });
          if (w) yourWebsite = w.domain || w.name || '';
        }
      }
    }

    const template = await generateCommonTemplate({
      purpose,
      tone,
      length,
      customInstructions,
      yourWebsite,
      senderName
    });

    return res.status(200).json({
      success: true,
      template,
      metadata: {
        purpose,
        tone,
        length,
        yourWebsite,
        campaignName
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Modify existing common email template (shorter, longer, tone, CTA, custom prompt)
 * POST /api/outreach/bulk/template/modify
 */
export async function modifyTemplate(req, res, next) {
  try {
    const userId = req.user._id;
    const {
      subject,
      body,
      action = 'Make Shorter',
      tone = '',
      customInstructions = '',
      websiteId,
      senderName = ''
    } = req.body;

    if (!subject || !body) {
      return res.status(400).json({
        success: false,
        message: 'Original subject and body are required to modify the common template.'
      });
    }

    let yourWebsite = '';
    if (websiteId) {
      const website = await Website.findOne({ _id: websiteId, userId });
      if (website) yourWebsite = website.domain || '';
    }

    const template = await modifyCommonTemplate({
      subject,
      body,
      action,
      tone,
      customInstructions,
      yourWebsite,
      senderName
    });

    return res.status(200).json({
      success: true,
      template
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Render batch preview of personalized emails for every selected prospect
 * POST /api/outreach/bulk/preview
 */
export async function previewBatch(req, res, next) {
  try {
    const userId = req.user._id;
    const {
      subjectTemplate = '',
      bodyTemplate = '',
      prospects = [],
      websiteId,
      campaignId,
      senderName = ''
    } = req.body;

    if (!subjectTemplate || !bodyTemplate) {
      return res.status(400).json({
        success: false,
        message: 'Both subjectTemplate and bodyTemplate are required to preview.'
      });
    }

    let yourWebsite = '';
    if (websiteId) {
      const website = await Website.findOne({ _id: websiteId, userId });
      if (website) yourWebsite = website.domain || '';
    }

    let campaignName = '';
    if (campaignId) {
      const campaign = await Campaign.findOne({ _id: campaignId, userId });
      if (campaign) {
        campaignName = campaign.name || '';
        if (!yourWebsite && campaign.websiteId) {
          const w = await Website.findOne({ _id: campaign.websiteId, userId });
          if (w) yourWebsite = w.domain || '';
        }
      }
    }

    const previews = prospects.map((p) =>
      personalizeForProspect({
        subjectTemplate,
        bodyTemplate,
        prospect: p,
        yourWebsite,
        senderName,
        campaignName
      })
    );

    return res.status(200).json({
      success: true,
      count: previews.length,
      previews
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Send personalized individual emails in bulk to all selected prospects
 * POST /api/outreach/bulk/send
 */
export async function sendBulk(req, res, next) {
  try {
    const userId = req.user._id;
    const {
      subjectTemplate,
      bodyTemplate,
      prospects = [],
      websiteId,
      campaignId,
      senderName
    } = req.body;

    if (!subjectTemplate || !bodyTemplate) {
      return res.status(400).json({
        success: false,
        message: 'Both subjectTemplate and bodyTemplate are required for bulk sending.'
      });
    }

    if (!Array.isArray(prospects) || prospects.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one prospect to send emails to.'
      });
    }

    let yourWebsite = '';
    if (websiteId) {
      const website = await Website.findOne({ _id: websiteId, userId });
      if (website) yourWebsite = website.domain || '';
    }

    let campaignName = '';
    if (campaignId) {
      const campaign = await Campaign.findOne({ _id: campaignId, userId });
      if (campaign) {
        campaignName = campaign.name || '';
        if (!yourWebsite && campaign.websiteId) {
          const w = await Website.findOne({ _id: campaign.websiteId, userId });
          if (w) yourWebsite = w.domain || '';
        }
      }
    }

    const result = await sendBulkEmails({
      userId,
      websiteId,
      campaignId,
      subjectTemplate,
      bodyTemplate,
      prospects,
      senderName,
      yourWebsite,
      campaignName
    });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Retry an individual failed email dispatch
 * POST /api/outreach/bulk/retry
 */
export async function retrySingle(req, res, next) {
  try {
    const userId = req.user._id;
    const {
      emailId,
      websiteId,
      campaignId,
      prospect,
      subject,
      body,
      recipientEmail,
      senderName
    } = req.body;

    const result = await retrySingleEmail({
      userId,
      emailId,
      websiteId,
      campaignId,
      prospect,
      subject,
      body,
      recipientEmail,
      senderName
    });

    return res.status(200).json({
      success: result.success,
      ...result
    });
  } catch (err) {
    next(err);
  }
}
