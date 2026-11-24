import mongoose from 'mongoose';
import ConnectedEmailAccount from '../models/ConnectedEmailAccount.js';
import EmailTemplate from '../models/EmailTemplate.js';
import OutreachEmail from '../models/OutreachEmail.js';
import EmailActivity from '../models/EmailActivity.js';
import ScheduledFollowUp from '../models/ScheduledFollowUp.js';
import Campaign from '../models/Campaign.js';
import Prospect from '../models/Prospect.js';
import CampaignProspectAssignment from '../models/CampaignProspectAssignment.js';
import Website from '../models/Website.js';
import { gmailService } from '../services/email/gmailService.js';
import { emailQueueService } from '../services/email/emailQueueService.js';
import { renderOutreachContent } from '../services/email/templateEngine.js';

// 1x1 transparent GIF buffer for open tracking pixel
const TRANSPARENT_1PX_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

/**
 * Validate that websiteId is valid and belongs to the authenticated user
 */
async function validateWebsite(websiteId, userId) {
  if (!websiteId || !mongoose.Types.ObjectId.isValid(websiteId)) {
    const err = new Error('Invalid website ID format.');
    err.status = 400;
    throw err;
  }
  const website = await Website.findOne({ _id: websiteId, userId });
  if (!website) {
    const err = new Error('Website not found or unauthorized.');
    err.status = 404;
    throw err;
  }
  return website;
}

// =============================================================================
// EMAIL ACCOUNT OPERATIONS
// =============================================================================

export async function getAccountStatus(req, res, next) {
  try {
    const userId = req.user._id;
    const status = await gmailService.getAccountStatus(userId);
    return res.json({ success: true, ...status });
  } catch (err) {
    next(err);
  }
}

export async function getGoogleAuthUrl(req, res, next) {
  try {
    const userId = req.user._id;
    const { returnTo } = req.query;
    const authUrl = gmailService.generateAuthUrl(userId, returnTo);
    return res.json({ success: true, authUrl });
  } catch (err) {
    next(err);
  }
}

export async function handleGoogleCallback(req, res, next) {
  try {
    const { code, state, error } = req.query;
    const frontendUrl = (
      process.env.CLIENT_URL?.trim() ||
      process.env.FRONTEND_URL?.trim() ||
      process.env.VITE_CLIENT_URL?.trim() ||
      'http://localhost:5173'
    ).replace(/\/+$/, '');

    // Parse state to extract userId and returnTo target
    let userId = req.user?._id?.toString();
    let returnTo = '/outreach';

    if (state) {
      try {
        if (typeof state === 'string' && state.startsWith('{')) {
          const parsed = JSON.parse(state);
          if (parsed.userId) userId = parsed.userId;
          if (parsed.returnTo) returnTo = parsed.returnTo;
        } else {
          userId = String(state);
        }
      } catch (_) {
        userId = String(state);
      }
    }

    if (!returnTo.startsWith('/')) {
      returnTo = `/${returnTo}`;
    }

    if (error) {
      console.error('[OutreachController] Google auth error:', error);
      const targetUrl = new URL(`${frontendUrl}${returnTo}`);
      targetUrl.searchParams.set('google_error', error);
      targetUrl.searchParams.set('gmail_error', error);
      return res.redirect(targetUrl.toString());
    }

    if (!code) {
      const targetUrl = new URL(`${frontendUrl}${returnTo}`);
      targetUrl.searchParams.set('google_error', 'No authorization code received from Google');
      targetUrl.searchParams.set('gmail_error', 'No authorization code received from Google');
      return res.redirect(targetUrl.toString());
    }

    // Identify user from state param or authenticated session
    if (!userId) {
      return res.redirect(`${frontendUrl}/login?error=Session+expired`);
    }

    await gmailService.handleOAuthCallback(code, userId);

    const targetUrl = new URL(`${frontendUrl}${returnTo}`);
    targetUrl.searchParams.set('google_connected', 'true');
    targetUrl.searchParams.set('gmail_connected', 'true');
    return res.redirect(targetUrl.toString());
  } catch (err) {
    console.error('[OutreachController] OAuth callback error:', err.message);
    const frontendUrl = (
      process.env.CLIENT_URL?.trim() ||
      process.env.FRONTEND_URL?.trim() ||
      process.env.VITE_CLIENT_URL?.trim() ||
      'http://localhost:5173'
    ).replace(/\/+$/, '');

    let returnTo = '/outreach';
    if (req.query.state && typeof req.query.state === 'string' && req.query.state.startsWith('{')) {
      try {
        const parsed = JSON.parse(req.query.state);
        if (parsed.returnTo) returnTo = parsed.returnTo;
      } catch (_) {}
    }

    if (!returnTo.startsWith('/')) {
      returnTo = `/${returnTo}`;
    }

    const targetUrl = new URL(`${frontendUrl}${returnTo}`);
    targetUrl.searchParams.set('google_error', err.message || 'OAuth callback failed');
    targetUrl.searchParams.set('gmail_error', err.message || 'OAuth callback failed');
    return res.redirect(targetUrl.toString());
  }
}

export async function disconnectAccount(req, res, next) {
  try {
    const userId = req.user._id;
    const result = await gmailService.disconnectAccount(userId);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// EMAIL TEMPLATE OPERATIONS
// =============================================================================

export async function listTemplates(req, res, next) {
  try {
    const userId = req.user._id;
    const templates = await EmailTemplate.find({ userId }).sort({ createdAt: -1 });
    return res.json({
      success: true,
      templates: templates.map((t) => t.toSafeObject())
    });
  } catch (err) {
    next(err);
  }
}

export async function createTemplate(req, res, next) {
  try {
    const userId = req.user._id;
    const { name, subject, body, description, tags, websiteId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Template name is required.' });
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, message: 'Template subject is required.' });
    }
    if (!body || !body.trim()) {
      return res.status(400).json({ success: false, message: 'Template body is required.' });
    }

    const template = await EmailTemplate.create({
      userId,
      websiteId: websiteId && mongoose.Types.ObjectId.isValid(websiteId) ? websiteId : null,
      name: name.trim(),
      subject: subject.trim(),
      body: body.trim(),
      description: (description || '').trim(),
      tags: Array.isArray(tags) ? tags : []
    });

    return res.status(201).json({
      success: true,
      message: 'Template created successfully.',
      template: template.toSafeObject()
    });
  } catch (err) {
    next(err);
  }
}

export async function getTemplate(req, res, next) {
  try {
    const userId = req.user._id;
    const { templateId } = req.params;

    const template = await EmailTemplate.findOne({ _id: templateId, userId });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found.' });
    }

    return res.json({ success: true, template: template.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

export async function updateTemplate(req, res, next) {
  try {
    const userId = req.user._id;
    const { templateId } = req.params;
    const { name, subject, body, description, tags } = req.body;

    const template = await EmailTemplate.findOne({ _id: templateId, userId });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found.' });
    }

    if (name) template.name = name.trim();
    if (subject) template.subject = subject.trim();
    if (body) template.body = body.trim();
    if (description !== undefined) template.description = description.trim();
    if (tags !== undefined) template.tags = Array.isArray(tags) ? tags : [];

    await template.save();

    return res.json({
      success: true,
      message: 'Template updated successfully.',
      template: template.toSafeObject()
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteTemplate(req, res, next) {
  try {
    const userId = req.user._id;
    const { templateId } = req.params;

    const deleted = await EmailTemplate.findOneAndDelete({ _id: templateId, userId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Template not found.' });
    }

    return res.json({ success: true, message: 'Template deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// EMAIL COMPOSITION, PREVIEW & SENDING
// =============================================================================

export async function previewOutreach(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId, campaignId } = req.params;
    const { prospectIds = [], subject, body, templateId, senderName } = req.body;

    const website = await validateWebsite(websiteId, userId);

    const campaign = await Campaign.findOne({ _id: campaignId, userId, websiteId });
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found.' });
    }

    let template = null;
    if (templateId && mongoose.Types.ObjectId.isValid(templateId)) {
      template = await EmailTemplate.findOne({ _id: templateId, userId });
    }

    const prospects = await Prospect.find({
      _id: { $in: prospectIds },
      userId,
      websiteId
    });

    const previews = prospects.map((prospect) => {
      const { subject: renderedSubject, body: renderedBody, context } = renderOutreachContent({
        template,
        subject,
        body,
        prospect,
        website,
        campaign,
        user: req.user,
        senderName
      });

      return {
        prospectId: prospect._id.toString(),
        domain: prospect.prospectDomain,
        recipientEmail: prospect.contactEmail || '',
        recipientName: context.contactName,
        subject: renderedSubject,
        body: renderedBody
      };
    });

    return res.json({ success: true, previews });
  } catch (err) {
    next(err);
  }
}

export async function sendOutreach(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId, campaignId } = req.params;
    const {
      templateId,
      subjectTemplate,
      bodyTemplate,
      prospectSelections = [],
      senderName,
      scheduledFor
    } = req.body;

    if (!Array.isArray(prospectSelections) || prospectSelections.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one prospect with a valid email address.'
      });
    }

    if (!subjectTemplate || !subjectTemplate.trim()) {
      return res.status(400).json({ success: false, message: 'Email subject is required.' });
    }

    if (!bodyTemplate || !bodyTemplate.trim()) {
      return res.status(400).json({ success: false, message: 'Email body is required.' });
    }

    await validateWebsite(websiteId, userId);

    const result = await emailQueueService.queueOutreachEmails({
      userId,
      websiteId,
      campaignId,
      templateId,
      subjectTemplate,
      bodyTemplate,
      prospectSelections,
      senderName,
      scheduledFor
    });

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getQueue(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId, campaignId } = req.params;
    const { status = 'all', page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 20), 100);
    const skip = (pageNum - 1) * limitNum;

    const query = { userId, websiteId, campaignId };
    if (status && status !== 'all') {
      query.status = status;
    }

    const [total, emails] = await Promise.all([
      OutreachEmail.countDocuments(query),
      OutreachEmail.find(query)
        .populate('prospectId', 'prospectDomain domainAuthority contactEmail')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
    ]);

    return res.json({
      success: true,
      emails: emails.map((e) => e.toSafeObject()),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getHistory(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId, campaignId } = req.params;

    const [totalSent, totalFailed, totalOpened, totalClicked, totalReplied, activities] = await Promise.all([
      OutreachEmail.countDocuments({ userId, websiteId, campaignId, status: 'sent' }),
      OutreachEmail.countDocuments({ userId, websiteId, campaignId, status: 'failed' }),
      OutreachEmail.countDocuments({ userId, websiteId, campaignId, openCount: { $gt: 0 } }),
      OutreachEmail.countDocuments({ userId, websiteId, campaignId, clickCount: { $gt: 0 } }),
      OutreachEmail.countDocuments({ userId, websiteId, campaignId, repliedAt: { $ne: null } }),
      EmailActivity.find({ userId, websiteId, campaignId })
        .sort({ createdAt: -1 })
        .limit(50)
    ]);

    return res.json({
      success: true,
      stats: {
        totalSent,
        totalFailed,
        totalOpened,
        totalClicked,
        totalReplied,
        openRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
        clickRate: totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0
      },
      activities: activities.map((a) => a.toSafeObject())
    });
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// FOLLOW-UP MANAGEMENT
// =============================================================================

export async function scheduleFollowUp(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId, campaignId } = req.params;
    const { prospectId, assignmentId, scheduledDate, notes, templateId } = req.body;

    if (!prospectId || !assignmentId) {
      return res.status(400).json({ success: false, message: 'prospectId and assignmentId are required.' });
    }

    if (!scheduledDate || new Date(scheduledDate) <= new Date()) {
      return res.status(400).json({ success: false, message: 'Scheduled date must be in the future.' });
    }

    const assignment = await CampaignProspectAssignment.findOne({
      _id: assignmentId,
      userId,
      websiteId,
      campaignId
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found or unauthorized.' });
    }

    // Cancel any existing pending follow-up for this assignment
    await ScheduledFollowUp.updateMany(
      { assignmentId, status: 'scheduled' },
      { $set: { status: 'cancelled', skipReason: 'Rescheduled by user' } }
    );

    const followUp = await ScheduledFollowUp.create({
      userId,
      websiteId,
      campaignId,
      prospectId,
      assignmentId,
      scheduledDate: new Date(scheduledDate),
      notes: notes || '',
      templateId: templateId || null,
      status: 'scheduled'
    });

    // Update assignment followUpAt
    assignment.followUpAt = new Date(scheduledDate);
    await assignment.save();

    return res.status(201).json({
      success: true,
      message: 'Follow-up scheduled successfully.',
      followUp: followUp.toSafeObject()
    });
  } catch (err) {
    next(err);
  }
}

export async function listFollowUps(req, res, next) {
  try {
    const userId = req.user._id;
    const { websiteId, campaignId } = req.params;

    const followUps = await ScheduledFollowUp.find({
      userId,
      websiteId,
      campaignId,
      status: 'scheduled'
    })
      .populate('prospectId', 'prospectDomain domainAuthority contactEmail')
      .sort({ scheduledDate: 1 });

    const now = new Date();
    const upcoming = [];
    const overdue = [];

    for (const f of followUps) {
      const obj = f.toSafeObject();
      obj.prospect = f.prospectId;
      if (new Date(f.scheduledDate) < now) {
        overdue.push(obj);
      } else {
        upcoming.push(obj);
      }
    }

    return res.json({
      success: true,
      upcoming,
      overdue,
      totalScheduled: followUps.length
    });
  } catch (err) {
    next(err);
  }
}

export async function cancelFollowUp(req, res, next) {
  try {
    const userId = req.user._id;
    const { followUpId } = req.params;

    const followUp = await ScheduledFollowUp.findOne({ _id: followUpId, userId });
    if (!followUp) {
      return res.status(404).json({ success: false, message: 'Follow-up not found.' });
    }

    followUp.status = 'cancelled';
    followUp.skipReason = 'Cancelled by user';
    await followUp.save();

    // Clear followUpAt on assignment
    await CampaignProspectAssignment.updateOne(
      { _id: followUp.assignmentId },
      { $set: { followUpAt: null } }
    );

    return res.json({ success: true, message: 'Follow-up cancelled.' });
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// PUBLIC EMAIL TRACKING ENDPOINTS (NO AUTH REQUIRED)
// =============================================================================

export async function trackOpen(req, res) {
  const { trackingId } = req.params;

  res.set({
    'Content-Type': 'image/gif',
    'Content-Length': TRANSPARENT_1PX_GIF.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    Pragma: 'no-cache',
    Expires: '0'
  });
  res.send(TRANSPARENT_1PX_GIF);

  // Asynchronously record open event without blocking image response
  if (trackingId) {
    try {
      const email = await OutreachEmail.findOne({ trackingId });
      if (email) {
        email.openCount += 1;
        if (!email.openedAt) {
          email.openedAt = new Date();
        }
        await email.save();

        await EmailActivity.create({
          userId: email.userId,
          websiteId: email.websiteId,
          campaignId: email.campaignId,
          prospectId: email.prospectId,
          outreachEmailId: email._id,
          eventType: 'opened',
          description: `Email opened by recipient (${email.openCount}x).`,
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });
      }
    } catch (err) {
      console.warn('[Tracking] Failed to log open:', err.message);
    }
  }
}

export async function trackClick(req, res) {
  const { trackingId } = req.params;
  const { url } = req.query;

  const targetUrl = url ? decodeURIComponent(url) : null;

  // Basic security: only redirect to valid HTTP(S) destinations
  if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
    return res.status(400).send('Invalid redirect URL.');
  }

  // Redirect recipient immediately
  res.redirect(302, targetUrl);

  // Record click event asynchronously
  if (trackingId) {
    try {
      const email = await OutreachEmail.findOne({ trackingId });
      if (email) {
        email.clickCount += 1;
        if (!email.clickedAt) {
          email.clickedAt = new Date();
        }
        await email.save();

        await EmailActivity.create({
          userId: email.userId,
          websiteId: email.websiteId,
          campaignId: email.campaignId,
          prospectId: email.prospectId,
          outreachEmailId: email._id,
          eventType: 'clicked',
          description: `Link clicked: ${targetUrl}`,
          metadata: { targetUrl },
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });
      }
    } catch (err) {
      console.warn('[Tracking] Failed to log click:', err.message);
    }
  }
}
