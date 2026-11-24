import mongoose from 'mongoose';
import OutreachEmail from '../../models/OutreachEmail.js';
import EmailActivity from '../../models/EmailActivity.js';
import ScheduledFollowUp from '../../models/ScheduledFollowUp.js';
import CampaignProspectAssignment from '../../models/CampaignProspectAssignment.js';
import CampaignActivity from '../../models/CampaignActivity.js';
import Prospect from '../../models/Prospect.js';
import Campaign from '../../models/Campaign.js';
import ConnectedEmailAccount from '../../models/ConnectedEmailAccount.js';
import { gmailService } from './gmailService.js';
import { renderOutreachContent } from './templateEngine.js';

class EmailQueueService {
  constructor() {
    this.isProcessing = false;
    this.intervalId = null;
    this.sendDelayMs = 1500; // 1.5 seconds between individual sends to respect rate limits
  }

  /**
   * Queue one or multiple outreach emails for sending
   */
  async queueOutreachEmails({
    userId,
    websiteId,
    campaignId,
    templateId = null,
    subjectTemplate,
    bodyTemplate,
    prospectSelections = [], // Array of { prospectId, assignmentId, recipientEmail, recipientName, customNotes }
    senderName,
    scheduledFor = null
  }) {
    // 1. Verify connected Gmail account exists and is connected
    const account = await ConnectedEmailAccount.findOne({
      userId,
      provider: 'gmail',
      status: 'connected'
    });

    if (!account) {
      const err = new Error('No active Gmail account connected. Please connect your Gmail account in Email Settings before sending.');
      err.status = 400;
      err.code = 'EMAIL_NOT_CONNECTED';
      throw err;
    }

    // 2. Fetch campaign details
    const campaign = await Campaign.findOne({ _id: campaignId, userId, websiteId });
    if (!campaign) {
      const err = new Error('Campaign not found or unauthorized.');
      err.status = 404;
      throw err;
    }

    const queuedEmails = [];
    const activitiesToCreate = [];

    const effectiveSendDate = scheduledFor ? new Date(scheduledFor) : new Date();

    for (const sel of prospectSelections) {
      const { prospectId, assignmentId, recipientEmail, recipientName } = sel;
      if (!recipientEmail || !recipientEmail.includes('@')) {
        continue; // Skip prospects missing valid email addresses
      }

      // Check if prospect is already in progress or queued
      const existingPending = await OutreachEmail.findOne({
        campaignId,
        prospectId,
        status: { $in: ['pending', 'processing'] }
      });

      if (existingPending) {
        continue; // Avoid duplicate queueing
      }

      // Fetch prospect for dynamic personalization
      const prospect = await Prospect.findById(prospectId);
      if (!prospect) continue;

      const { subject, body } = renderOutreachContent({
        subject: subjectTemplate,
        body: bodyTemplate,
        prospect: {
          ...prospect.toObject(),
          contactEmail: recipientEmail,
          contactName: recipientName || prospect.contactName
        },
        website: { domain: campaign.domain || '' },
        campaign: { name: campaign.name },
        senderName: senderName || account.metadata?.name || account.email
      });

      const outreachDoc = new OutreachEmail({
        userId,
        websiteId,
        campaignId,
        prospectId,
        assignmentId: assignmentId || null,
        templateId: templateId || null,
        connectedAccountId: account._id,
        recipientEmail: recipientEmail.trim().toLowerCase(),
        recipientName: recipientName || '',
        senderEmail: account.email,
        senderName: senderName || account.metadata?.name || '',
        subject,
        bodyHtml: body,
        bodyText: body.replace(/<[^>]+>/g, ' '),
        status: 'pending',
        scheduledFor: effectiveSendDate,
        attempts: 0
      });

      await outreachDoc.save();
      queuedEmails.push(outreachDoc);

      activitiesToCreate.push({
        userId,
        websiteId,
        campaignId,
        prospectId,
        outreachEmailId: outreachDoc._id,
        eventType: 'queued',
        description: `Outreach email queued to ${recipientEmail} with subject "${subject}".`
      });
    }

    if (activitiesToCreate.length > 0) {
      await EmailActivity.insertMany(activitiesToCreate);
    }

    // Trigger queue processing asynchronously
    setImmediate(() => this.processNextQueueItem());

    return {
      success: true,
      totalQueued: queuedEmails.length,
      emails: queuedEmails.map((e) => e.toSafeObject())
    };
  }

  /**
   * Process a single queued email atomically
   */
  async processNextQueueItem() {
    if (this.isProcessing) return;
    if (mongoose.connection.readyState !== 1 || this.stopped) return;
    this.isProcessing = true;

    try {
      const now = new Date();

      // Find oldest pending email scheduled for now or earlier
      const emailItem = await OutreachEmail.findOneAndUpdate(
        {
          status: 'pending',
          scheduledFor: { $lte: now },
          attempts: { $lt: 3 }
        },
        {
          $set: { status: 'processing' },
          $inc: { attempts: 1 }
        },
        {
          sort: { scheduledFor: 1, createdAt: 1 },
          returnDocument: 'after'
        }
      );

      if (!emailItem) {
        this.isProcessing = false;
        return; // Nothing to process right now
      }

      // Attempt to send via Gmail API
      try {
        const sendResult = await gmailService.sendEmail({
          userId: emailItem.userId,
          to: emailItem.recipientEmail,
          subject: emailItem.subject,
          htmlBody: emailItem.bodyHtml,
          textBody: emailItem.bodyText,
          trackingId: emailItem.trackingId
        });

        // 1. Mark OutreachEmail as sent
        emailItem.status = 'sent';
        emailItem.sentAt = new Date();
        emailItem.gmailMessageId = sendResult.messageId;
        emailItem.gmailThreadId = sendResult.threadId;
        emailItem.errorMessage = '';
        await emailItem.save();

        // 2. Phase 10 Integration: Update CampaignProspectAssignment to "contacted"
        if (emailItem.assignmentId) {
          const assignment = await CampaignProspectAssignment.findById(emailItem.assignmentId);
          if (assignment && assignment.outreachStatus === 'uncontacted') {
            assignment.outreachStatus = 'contacted';
            if (!assignment.contactedAt) {
              assignment.contactedAt = new Date();
            }
            await assignment.save();

            // Record CampaignActivity audit entry
            await CampaignActivity.create({
              userId: emailItem.userId,
              websiteId: emailItem.websiteId,
              campaignId: emailItem.campaignId,
              assignmentId: assignment._id,
              action: 'outreach_status_changed',
              description: `Sent outreach email to ${emailItem.recipientEmail}. Outreach stage advanced to Contacted.`,
              metadata: {
                previousStatus: 'uncontacted',
                newStatus: 'contacted',
                emailId: emailItem._id,
                gmailMessageId: sendResult.messageId
              }
            });
          }
        }

        // 3. Record EmailActivity
        await EmailActivity.create({
          userId: emailItem.userId,
          websiteId: emailItem.websiteId,
          campaignId: emailItem.campaignId,
          prospectId: emailItem.prospectId,
          outreachEmailId: emailItem._id,
          eventType: 'sent',
          description: `Email sent to ${emailItem.recipientEmail} via Gmail.`,
          metadata: {
            messageId: sendResult.messageId,
            threadId: sendResult.threadId
          }
        });

      } catch (sendErr) {
        console.error('[EmailQueueService] Send failure:', sendErr.message);

        const isTerminal =
          sendErr.status === 400 ||
          sendErr.status === 401 ||
          sendErr.code === 'GMAIL_REVOKED' ||
          sendErr.code === 'GMAIL_NOT_CONNECTED' ||
          emailItem.attempts >= emailItem.maxAttempts;

        if (isTerminal) {
          emailItem.status = 'failed';
          emailItem.failedAt = new Date();
          emailItem.errorMessage = sendErr.message || 'Email sending failed.';
          await emailItem.save();

          await EmailActivity.create({
            userId: emailItem.userId,
            websiteId: emailItem.websiteId,
            campaignId: emailItem.campaignId,
            prospectId: emailItem.prospectId,
            outreachEmailId: emailItem._id,
            eventType: 'failed',
            description: `Permanent send failure to ${emailItem.recipientEmail}: ${sendErr.message}`,
            metadata: { error: sendErr.message }
          });
        } else {
          // Temporary retry with exponential backoff (e.g. 2 min, 5 min)
          const delayMinutes = emailItem.attempts * 2;
          emailItem.status = 'pending';
          emailItem.scheduledFor = new Date(Date.now() + delayMinutes * 60000);
          emailItem.errorMessage = `Retry ${emailItem.attempts}/${emailItem.maxAttempts}: ${sendErr.message}`;
          await emailItem.save();

          await EmailActivity.create({
            userId: emailItem.userId,
            websiteId: emailItem.websiteId,
            campaignId: emailItem.campaignId,
            prospectId: emailItem.prospectId,
            outreachEmailId: emailItem._id,
            eventType: 'retried',
            description: `Temporary failure. Scheduled retry in ${delayMinutes}m. Reason: ${sendErr.message}`,
            metadata: { attempt: emailItem.attempts }
          });
        }
      }

    } catch (queueErr) {
      console.error('[EmailQueueService] Fatal queue loop error:', queueErr);
    } finally {
      this.isProcessing = false;

      // Check if more pending emails exist after throttle delay
      if (mongoose.connection.readyState === 1 && !this.stopped) {
        if (this.throttleTimer) clearTimeout(this.throttleTimer);
        this.throttleTimer = setTimeout(() => {
          this.processNextQueueItem();
        }, this.sendDelayMs);
      }
    }
  }

  /**
   * Process scheduled follow-ups that are now due
   */
  async processScheduledFollowUps() {
    if (mongoose.connection.readyState !== 1 || this.stopped) return 0;
    let processedCount = 0;
    try {
      const now = new Date();

      const dueFollowUps = await ScheduledFollowUp.find({
        status: 'scheduled',
        scheduledDate: { $lte: now }
      }).limit(20);

      for (const followUp of dueFollowUps) {
        // Inspect current assignment state
        const assignment = await CampaignProspectAssignment.findById(followUp.assignmentId);
        if (!assignment) {
          followUp.status = 'skipped';
          followUp.skipReason = 'Prospect assignment no longer exists';
          await followUp.save();
          processedCount++;
          continue;
        }

        // Check if prospect has replied, was rejected, or became unresponsive
        const terminalStatuses = ['replied', 'negotiating', 'link_acquired', 'rejected', 'unresponsive'];
        if (terminalStatuses.includes(assignment.outreachStatus)) {
          followUp.status = 'skipped';
          followUp.skipReason = `Prospect is in "${assignment.outreachStatus}" stage; automated follow-up skipped.`;
          await followUp.save();
          processedCount++;
          continue;
        }

        // Advance outreach status to 'follow_up_due' if currently 'contacted'
        if (assignment.outreachStatus === 'contacted') {
          assignment.outreachStatus = 'follow_up_due';
          assignment.followUpAt = new Date();
          await assignment.save();

          await CampaignActivity.create({
            userId: followUp.userId,
            websiteId: followUp.websiteId,
            campaignId: followUp.campaignId,
            assignmentId: assignment._id,
            action: 'outreach_status_changed',
            description: 'Scheduled follow-up date reached. Outreach stage marked as Follow-Up Due.',
            metadata: {
              previousStatus: 'contacted',
              newStatus: 'follow_up_due'
            }
          });
        }

        followUp.status = 'executed';
        followUp.executedAt = new Date();
        await followUp.save();
        processedCount++;
      }
      return processedCount;
    } catch (err) {
      console.error('[EmailQueueService] Follow-up check error:', err.message);
      return processedCount;
    }
  }

  /**
   * Start recurring background scheduler
   */
  startScheduler() {
    if (this.intervalId) return;
    console.log('📬 Outreach Email Queue & Follow-up Scheduler started (tick: 10s)');
    this.intervalId = setInterval(() => {
      this.processNextQueueItem();
      this.processScheduledFollowUps();
    }, 10000); // Check every 10 seconds
  }

  /**
   * Stop recurring background scheduler (for clean shutdown / tests)
   */
  stopScheduler() {
    this.stopped = true;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
    }
  }
}

export const emailQueueService = new EmailQueueService();
export default emailQueueService;
