import test, { describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateFallbackCommonTemplate,
  personalizeForProspect,
  modifyCommonTemplate,
  sendBulkEmails,
  retrySingleEmail,
  BULK_EMAIL_PURPOSES,
  BULK_EMAIL_TONES,
  BULK_EMAIL_LENGTHS
} from '../services/bulkEmailService.js';
import ConnectedEmailAccount from '../models/ConnectedEmailAccount.js';
import OutreachEmail from '../models/OutreachEmail.js';
import CampaignProspectAssignment from '../models/CampaignProspectAssignment.js';
import EmailActivity from '../models/EmailActivity.js';
import { gmailService } from '../services/email/gmailService.js';

describe('LINKORA — Bulk Email Automation & Generation Unit Tests', () => {
  const sampleProspectWithName = {
    _id: '674000000000000000000001',
    prospectDomain: 'techcrunch.com',
    prospectUrl: 'https://techcrunch.com/article-1',
    companyName: 'TechCrunch',
    contactEmail: 'alex@techcrunch.com',
    contactName: 'Alex'
  };

  const sampleProspectWithoutName = {
    _id: '674000000000000000000002',
    prospectDomain: 'searchengineland.com',
    prospectUrl: 'https://searchengineland.com/seo-guide',
    companyName: 'Search Engine Land',
    contactEmail: 'editorial@searchengineland.com',
    contactName: '' // Missing name
  };

  const sampleProspectWithoutCompanyOrName = {
    _id: '674000000000000000000003',
    prospectDomain: 'awesomeblog.io',
    contactEmail: 'contact@awesomeblog.io'
  };

  describe('Template Generation & Placeholders', () => {
    test('generateFallbackCommonTemplate produces ONE template with all dynamic placeholders', () => {
      const template = generateFallbackCommonTemplate({
        purpose: 'Backlink Request',
        tone: 'Professional',
        length: 'Medium',
        yourWebsite: 'linkora.com',
        senderName: 'David from Linkora'
      });

      assert.ok(template.subject, 'Subject must be generated');
      assert.ok(template.body, 'Body must be generated');

      // Placeholders must be present in common template
      assert.ok(template.body.includes('{{recipient_name}}'), 'Body must contain {{recipient_name}} placeholder');
      assert.ok(template.body.includes('{{company_name}}'), 'Body must contain {{company_name}} placeholder');
      assert.ok(template.body.includes('{{website_domain}}'), 'Body must contain {{website_domain}} placeholder');
      assert.ok(template.body.includes('David from Linkora'), 'Body must contain sender name');
      assert.ok(template.body.includes('linkora.com'), 'Body must contain your website');
    });

    test('supports all allowed purposes, tones, and lengths', () => {
      BULK_EMAIL_PURPOSES.forEach((purpose) => {
        const res = generateFallbackCommonTemplate({ purpose });
        assert.ok(res.subject.length > 5, `Subject for ${purpose} must not be empty`);
        assert.ok(res.body.length > 20, `Body for ${purpose} must not be empty`);
      });

      BULK_EMAIL_LENGTHS.forEach((length) => {
        const res = generateFallbackCommonTemplate({ length });
        assert.ok(res.body.length > 20, `Body for length ${length} must not be empty`);
      });
    });
  });

  describe('Automatic Personalization & Missing Data Handling', () => {
    test('personalizes common template correctly when recipient name is present', () => {
      const commonTemplate = {
        subject: 'Content idea for {{website_domain}}',
        body: 'Hi {{recipient_name}},\n\nI was browsing {{company_name}} on {{website_domain}} and love what you do.\n\nBest,\n{{sender_name}}'
      };

      const result = personalizeForProspect({
        subjectTemplate: commonTemplate.subject,
        bodyTemplate: commonTemplate.body,
        prospect: sampleProspectWithName,
        yourWebsite: 'linkora.com',
        senderName: 'David'
      });

      assert.equal(result.domain, 'techcrunch.com');
      assert.equal(result.recipientName, 'Alex');
      assert.equal(result.recipientEmail, 'alex@techcrunch.com');
      assert.equal(result.subject, 'Content idea for techcrunch.com');
      assert.ok(result.body.startsWith('Hi Alex,'), 'Should greet Alex by name');
      assert.ok(result.body.includes('browsing TechCrunch on techcrunch.com'));
      assert.ok(result.body.includes('Best,\nDavid'));
      assert.ok(!result.body.includes('{{'), 'No raw placeholders should remain');
    });

    test('cleanly replaces missing recipient name with neutral greeting without dangling comma', () => {
      const commonTemplate = {
        subject: 'Collaboration with {{company_name}}',
        body: 'Hi {{recipient_name}},\n\nI love what {{company_name}} is building on {{website_domain}}.\n\nBest,\n{{sender_name}}'
      };

      const result = personalizeForProspect({
        subjectTemplate: commonTemplate.subject,
        bodyTemplate: commonTemplate.body,
        prospect: sampleProspectWithoutName,
        yourWebsite: 'linkora.com',
        senderName: 'David'
      });

      assert.equal(result.recipientEmail, 'editorial@searchengineland.com');
      // Should replace "Hi {{recipient_name}}," with "Hi Search Engine Land Team,"
      assert.ok(result.body.startsWith('Hi Search Engine Land Team,'), `Should use neutral team greeting, got: "${result.body.slice(0, 35)}"`);
      // Must NOT contain "Hi ,"
      assert.ok(!result.body.includes('Hi ,'), 'Must not contain empty name comma');
      assert.ok(!result.body.includes('{{recipient_name}}'));
      assert.ok(!result.body.includes('{{'), 'No raw placeholders should remain');
    });

    test('cleanly replaces missing name and missing company with domain team or neutral fallback', () => {
      const commonTemplate = {
        subject: 'Quick question regarding {{website_domain}}',
        body: 'Hi {{recipient_name}},\n\nWe would love to collaborate with {{website_domain}}.\n\nBest,\n{{sender_name}}'
      };

      const result = personalizeForProspect({
        subjectTemplate: commonTemplate.subject,
        bodyTemplate: commonTemplate.body,
        prospect: sampleProspectWithoutCompanyOrName,
        yourWebsite: 'linkora.com',
        senderName: 'David'
      });

      assert.ok(
        result.body.startsWith('Hi Awesomeblog Team,') || result.body.startsWith('Hi awesomeblog.io Team,'),
        `Should fallback to domain team greeting, got: "${result.body.slice(0, 35)}"`
      );
      assert.ok(!result.body.includes('Hi ,'), 'Must never output dangling "Hi ,"');
    });
  });

  describe('Template Modification Actions', () => {
    test('modifyCommonTemplate supports 1-click actions and preserves dynamic placeholders', async () => {
      const template = {
        subject: 'Content idea for {{website_domain}}',
        body: 'Hi {{recipient_name}},\n\nI was reading through {{company_name}} on {{website_domain}}.\n\nWould you be open to a collaboration?\n\nBest,\n{{sender_name}}'
      };

      // Shorter
      const shorter = await modifyCommonTemplate({
        subject: template.subject,
        body: template.body,
        action: 'Make Shorter'
      });
      assert.ok(shorter.body.includes('{{recipient_name}}'), 'Must preserve placeholders');

      // More Professional
      const pro = await modifyCommonTemplate({
        subject: template.subject,
        body: template.body,
        action: 'More Professional'
      });
      assert.ok(pro.body.includes('{{website_domain}}'));

      // Improve Subject Line
      const subj = await modifyCommonTemplate({
        subject: template.subject,
        body: template.body,
        action: 'Improve Subject Line'
      });
      assert.ok(subj.subject.includes('{{website_domain}}'));
    });
  });

  describe('Bulk Dispatch Logic & Rate Pacing', () => {
    test('throws 400 error when user has no connected Gmail account', async () => {
      const origFindOne = ConnectedEmailAccount.findOne;
      ConnectedEmailAccount.findOne = async () => null;

      try {
        await assert.rejects(
          async () => {
            await sendBulkEmails({
              userId: '674000000000000000000099',
              subjectTemplate: 'Hello {{website_domain}}',
              bodyTemplate: 'Hi {{recipient_name}},\n\nCheck out {{your_website}}.',
              prospects: [sampleProspectWithName]
            });
          },
          {
            message: /No active Gmail account is connected/
          }
        );
      } finally {
        ConnectedEmailAccount.findOne = origFindOne;
      }
    });

    test('successfully dispatches separate individual emails with tracking and progress', async () => {
      // Mock ConnectedEmailAccount
      const origAccountFindOne = ConnectedEmailAccount.findOne;
      ConnectedEmailAccount.findOne = async () => ({
        _id: '674000000000000000000077',
        email: 'user@gmail.com',
        provider: 'gmail',
        status: 'connected',
        metadata: { name: 'Alex Sender' }
      });

      // Mock gmailService.sendEmail
      const origSendEmail = gmailService.sendEmail;
      const sentCalls = [];
      gmailService.sendEmail = async (params) => {
        sentCalls.push(params);
        return {
          success: true,
          messageId: `msg_${Date.now()}_${sentCalls.length}`,
          threadId: `th_${Date.now()}`
        };
      };

      // Mock Mongoose model prototypes
      const origOutreachSave = OutreachEmail.prototype.save;
      OutreachEmail.prototype.save = async function () {
        this._id = this._id || '674000000000000000000088';
        return this;
      };

      const origAssignmentFindByIdAndUpdate = CampaignProspectAssignment.findByIdAndUpdate;
      const origAssignmentFindOneAndUpdate = CampaignProspectAssignment.findOneAndUpdate;
      let assignmentUpdated = false;
      CampaignProspectAssignment.findByIdAndUpdate = async () => {
        assignmentUpdated = true;
        return {};
      };
      CampaignProspectAssignment.findOneAndUpdate = async () => {
        assignmentUpdated = true;
        return {};
      };

      const origEmailActivityCreate = EmailActivity.create;
      let activityCreated = false;
      EmailActivity.create = async () => {
        activityCreated = true;
        return {};
      };

      try {
        const prospectsList = [
          {
            ...sampleProspectWithName,
            assignmentId: '674000000000000000000055'
          },
          sampleProspectWithoutName,
          {
            _id: '674000000000000000000004',
            prospectDomain: 'noemail.com',
            contactEmail: '' // Invalid / missing email
          }
        ];

        const result = await sendBulkEmails({
          userId: '674000000000000000000099',
          websiteId: '674000000000000000000010',
          campaignId: '674000000000000000000020',
          subjectTemplate: 'Resource for {{website_domain}}',
          bodyTemplate: 'Hi {{recipient_name}},\n\nLoved {{company_name}}.',
          prospects: prospectsList,
          yourWebsite: 'linkora.com'
        });

        assert.equal(result.total, 3);
        assert.equal(result.sentCount, 2, '2 prospects with valid emails should succeed');
        assert.equal(result.failedCount, 1, '1 prospect with no email should fail');
        assert.equal(sentCalls.length, 2, 'Gmail API sendEmail should be called twice (separately)');

        // Individual sends verification:
        assert.equal(sentCalls[0].to, 'alex@techcrunch.com');
        assert.ok(sentCalls[0].textBody.startsWith('Hi Alex,'));
        assert.equal(sentCalls[1].to, 'editorial@searchengineland.com');
        assert.ok(sentCalls[1].textBody.startsWith('Hi Search Engine Land Team,'));

        // Check that assignment status was updated
        assert.ok(assignmentUpdated, 'CampaignProspectAssignment should be updated to contacted');
        assert.ok(activityCreated, 'EmailActivity should be recorded');
      } finally {
        ConnectedEmailAccount.findOne = origAccountFindOne;
        gmailService.sendEmail = origSendEmail;
        OutreachEmail.prototype.save = origOutreachSave;
        CampaignProspectAssignment.findByIdAndUpdate = origAssignmentFindByIdAndUpdate;
        CampaignProspectAssignment.findOneAndUpdate = origAssignmentFindOneAndUpdate;
        EmailActivity.create = origEmailActivityCreate;
      }
    });

    test('retrySingleEmail successfully retries a failed email', async () => {
      const origAccountFindOne = ConnectedEmailAccount.findOne;
      ConnectedEmailAccount.findOne = async () => ({
        _id: '674000000000000000000077',
        email: 'user@gmail.com',
        status: 'connected'
      });

      const origOutreachFindOne = OutreachEmail.findOne;
      OutreachEmail.findOne = async () => ({
        _id: '674000000000000000000088',
        recipientEmail: 'alex@techcrunch.com',
        subject: 'Retry subject',
        bodyText: 'Retry body',
        trackingId: 'track123',
        save: async () => {}
      });

      const origSendEmail = gmailService.sendEmail;
      let retried = false;
      gmailService.sendEmail = async () => {
        retried = true;
        return { messageId: 'msg_retry_1' };
      };

      try {
        const res = await retrySingleEmail({
          userId: '674000000000000000000099',
          emailId: '674000000000000000000088'
        });

        assert.equal(res.success, true);
        assert.equal(res.status, 'sent');
        assert.ok(retried, 'gmailService.sendEmail should have been called on retry');
      } finally {
        ConnectedEmailAccount.findOne = origAccountFindOne;
        OutreachEmail.findOne = origOutreachFindOne;
        gmailService.sendEmail = origSendEmail;
      }
    });
  });
});
