import OpenAI from 'openai';
import mongoose from 'mongoose';
import OutreachEmail from '../models/OutreachEmail.js';
import EmailActivity from '../models/EmailActivity.js';
import CampaignProspectAssignment from '../models/CampaignProspectAssignment.js';
import ConnectedEmailAccount from '../models/ConnectedEmailAccount.js';
import Prospect from '../models/Prospect.js';
import { gmailService } from './email/gmailService.js';

export const BULK_EMAIL_PURPOSES = [
  'Backlink Request',
  'Guest Post',
  'Link Insertion',
  'Collaboration',
  'Partnership',
  'Follow-up',
  'Custom'
];

export const BULK_EMAIL_TONES = [
  'Professional',
  'Friendly',
  'Formal',
  'Persuasive',
  'Casual',
  'Natural and Human',
  'Confident'
];

export const BULK_EMAIL_LENGTHS = ['Short', 'Medium', 'Detailed'];

export const SUPPORTED_PLACEHOLDERS = [
  '{{recipient_name}}',
  '{{company_name}}',
  '{{website_domain}}',
  '{{sender_name}}',
  '{{your_website}}'
];

/**
 * Initialize OpenAI client if API key is present in environment
 */
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    return null;
  }
  return new OpenAI({ apiKey });
}

/**
 * High-quality deterministic fallback template generator
 * Used when offline, during tests, or when OpenAI API key is unavailable
 */
export function generateFallbackCommonTemplate({
  purpose = 'Backlink Request',
  tone = 'Professional',
  length = 'Medium',
  customInstructions = '',
  yourWebsite = 'our website',
  senderName = 'The Team'
}) {
  const isShort = length === 'Short';
  const isDetailed = length === 'Detailed';
  const websiteRef = yourWebsite || 'our website';
  const signoff = senderName ? `Best regards,\n${senderName}` : 'Best regards,\nContent & Partnerships';

  let subject = '';
  let body = '';

  switch (purpose) {
    case 'Guest Post':
      subject = `Guest contribution idea for {{website_domain}}`;
      if (isShort) {
        body = `Hi {{recipient_name}},\n\nI’ve been reading {{company_name}}'s recent publications and would love to contribute an original, high-value guide tailored to your audience.\n\nCould I send over 2-3 specific headline ideas for your review?\n\n${signoff}`;
      } else if (isDetailed) {
        body = `Hi {{recipient_name}},\n\nI’m reaching out because I follow {{company_name}} and truly appreciate the quality of insights you publish on {{website_domain}}.\n\nWe recently published comprehensive research at ${websiteRef} and I’d love to write an exclusive, in-depth guest article for your blog covering actionable strategies and real-world takeaways that your readers will find valuable.\n\nI've outlined a few headline concepts tailored specifically for your audience. Would you be open to reviewing a short outline?\n\n${signoff}`;
      } else {
        body = `Hi {{recipient_name}},\n\nI’ve been following {{company_name}} and really enjoy your content on {{website_domain}}.\n\nI’d love to write a fresh, practical guest article for your blog. Based on what resonates most with your readers, I have 2-3 specific topic proposals ready.\n\nWould you be open to taking a look at a brief pitch?\n\n${signoff}`;
      }
      break;

    case 'Link Insertion':
      subject = `Quick resource suggestion for {{website_domain}}`;
      if (isShort) {
        body = `Hi {{recipient_name}},\n\nI came across your published guide on {{website_domain}} and noticed you cover relevant industry solutions. We recently published an updated, free resource on ${websiteRef} that your readers would love.\n\nWould you be open to linking to it in your article?\n\n${signoff}`;
      } else if (isDetailed) {
        body = `Hi {{recipient_name}},\n\nI was reading through your insightful articles on {{website_domain}} and wanted to thank you for maintaining such a helpful resource for the community.\n\nIn your guide, you reference key benchmarks in our space. We recently released an updated, data-backed guide on ${websiteRef} that provides actionable step-by-step solutions and updated metrics.\n\nI think it would make a great complementary resource for your readers. Would you be open to taking a quick look?\n\n${signoff}`;
      } else {
        body = `Hi {{recipient_name}},\n\nI was exploring {{website_domain}} and really enjoyed your thorough coverage of industry best practices.\n\nWe recently created an in-depth reference guide on ${websiteRef} with new data and actionable checklists that enriches that topic.\n\nWould you consider adding a quick link to it so your readers have access to the latest data?\n\n${signoff}`;
      }
      break;

    case 'Collaboration':
    case 'Partnership':
      subject = `Collaboration proposal: {{company_name}} & ${websiteRef}`;
      if (isShort) {
        body = `Hi {{recipient_name}},\n\nI admire what {{company_name}} is building at {{website_domain}}. I think there’s a great opportunity for our teams to collaborate on co-marketing and valuable content initiatives.\n\nWould you be open to a quick 10-minute chat this week?\n\n${signoff}`;
      } else {
        body = `Hi {{recipient_name}},\n\nI’ve been following {{company_name}}’s work on {{website_domain}} and see strong alignment between our respective audiences.\n\nAt ${websiteRef}, we're looking to partner with forward-thinking teams for co-marketing, shared editorial features, and reciprocal value creation.\n\nDo you have a few minutes this week to explore how we can collaborate?\n\n${signoff}`;
      }
      break;

    case 'Follow-up':
      subject = `Quick follow-up regarding {{website_domain}}`;
      body = `Hi {{recipient_name}},\n\nJust wanted to follow up quickly on my note from last week in case it got buried in your inbox.\n\nWe’d still love to collaborate with {{company_name}} or contribute to {{website_domain}} if this is something of interest.\n\nLet me know if you'd like me to send over more details!\n\n${signoff}`;
      break;

    case 'Custom':
    case 'Backlink Request':
    default:
      subject = `Content partnership idea for {{website_domain}}`;
      if (isShort) {
        body = `Hi {{recipient_name}},\n\nI came across {{company_name}} on {{website_domain}} and noticed your focus on high-quality industry guides.\n\nWe recently created an authoritative resource on ${websiteRef} that directly complements your content. Would you be open to referencing it in your post?\n\n${signoff}`;
      } else if (isDetailed) {
        body = `Hi {{recipient_name}},\n\nI've been following {{website_domain}} and really appreciate the actionable insights {{company_name}} shares with readers.\n\nWhile reading your recent articles, I noticed you frequently link to helpful industry studies. We recently completed a comprehensive analysis at ${websiteRef} packed with unique data points and practical takeaways.\n\nI believe it would add direct value to your audience as an additional reference. Would you be open to taking a look and considering a link?\n\n${signoff}`;
      } else {
        body = `Hi {{recipient_name}},\n\nI was reading through {{company_name}}'s articles on {{website_domain}} and noticed your excellent coverage of key industry topics.\n\nWe recently published an in-depth piece on ${websiteRef} that provides updated data and actionable tips. I thought it might make a valuable addition to your resources.\n\nWould you be open to taking a quick look?\n\n${signoff}`;
      }
      break;
  }

  if (customInstructions && customInstructions.trim()) {
    body = body.replace(
      `Would you be open to`,
      `Specifically regarding ${customInstructions.trim().slice(0, 80)}, would you be open to`
    );
  }

  return { subject, body };
}

/**
 * Generate ONE common email template with dynamic placeholders using OpenAI or deterministic fallback
 */
export async function generateCommonTemplate({
  purpose = 'Backlink Request',
  tone = 'Professional',
  length = 'Medium',
  customInstructions = '',
  yourWebsite = '',
  senderName = ''
}) {
  const openai = getOpenAIClient();

  if (!openai) {
    return generateFallbackCommonTemplate({
      purpose,
      tone,
      length,
      customInstructions,
      yourWebsite,
      senderName
    });
  }

  const prompt = `You are an expert outreach copywriter for LINKORA. Generate ONE common email template for bulk link-building and outreach.

CRITICAL REQUIREMENTS:
1. Dynamic Placeholders:
   You MUST use the exact placeholder tokens:
   - {{recipient_name}} for the recipient's first name
   - {{company_name}} for the recipient's company or brand
   - {{website_domain}} for the recipient's domain name (e.g. techcrunch.com)
   - {{sender_name}} for the sender's full name
   - {{your_website}} for the sender's website domain

2. Greeting Rule:
   Start the email body strictly with:
   "Hi {{recipient_name}}," or "Hello {{recipient_name}},"
   This allows our personalization engine to cleanly fallback to a neutral greeting ("Hi there," or "Hi [Domain] Team,") if the recipient name is not known.

3. Context & Parameters:
   - Email Purpose: ${purpose}
   - Desired Tone: ${tone}
   - Length: ${length} (Short = 50-90 words, Medium = 100-150 words, Detailed = 160-230 words)
   - Sender Name: ${senderName || 'The Team'}
   - Sender Website: ${yourWebsite || 'our website'}
   ${customInstructions ? `- Custom Instructions from User: "${customInstructions}"` : ''}

4. Quality Rules:
   - Do NOT use generic buzzword clichés like "I hope this email finds you well" or "My name is X and I am writing because...".
   - Keep it natural, human, authentic, and direct.
   - Return clean plain text without Markdown asterisks or bolding.

5. JSON Output Format:
   Respond ONLY with valid JSON with two string keys:
   {
     "subject": "The email subject line containing placeholders where appropriate",
     "body": "The email body containing placeholders and clean paragraph breaks"
   }`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an outreach copywriting engine that outputs structured JSON.'
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 600
    });

    const content = response.choices?.[0]?.message?.content?.trim();
    if (content) {
      const parsed = JSON.parse(content);
      if (parsed.subject && parsed.body) {
        return {
          subject: String(parsed.subject).trim(),
          body: String(parsed.body).trim()
        };
      }
    }
  } catch (err) {
    console.warn('[bulkEmailService] OpenAI generation failed, falling back:', err.message);
  }

  return generateFallbackCommonTemplate({
    purpose,
    tone,
    length,
    customInstructions,
    yourWebsite,
    senderName
  });
}

/**
 * Modify an existing common email template using 1-click actions or custom instructions
 */
export async function modifyCommonTemplate({
  subject = '',
  body = '',
  action = 'Make Shorter',
  tone = '',
  customInstructions = '',
  yourWebsite = '',
  senderName = ''
}) {
  const openai = getOpenAIClient();

  if (!openai) {
    // Deterministic fallback modifier
    let newSubject = subject;
    let newBody = body;

    switch (action) {
      case 'Make Shorter': {
        const lines = newBody.split('\n\n');
        if (lines.length > 2) {
          newBody = [lines[0], lines[lines.length - 1]].join('\n\n');
        }
        break;
      }
      case 'Make Longer': {
        newBody = newBody.replace(
          '{{company_name}}',
          '{{company_name}}, particularly noting your recent impactful coverage'
        );
        break;
      }
      case 'More Professional': {
        newBody = newBody
          .replace(/Hey /g, 'Dear ')
          .replace(/love to/g, 'would appreciate the opportunity to')
          .replace(/take a look/g, 'review our proposal');
        break;
      }
      case 'More Persuasive': {
        newBody = newBody.replace(
          'Would you be open',
          'This would provide your readers with immediate, actionable value and updated data. Would you be open'
        );
        break;
      }
      case 'More Natural': {
        newBody = newBody
          .replace(/Dear /g, 'Hi ')
          .replace(/I am writing to/g, 'Wanted to quickly ask if');
        break;
      }
      case 'Improve Subject Line': {
        newSubject = `Quick thought for {{website_domain}}`;
        break;
      }
      case 'Improve Opening Line': {
        newBody = newBody.replace(
          /Hi \{\{recipient_name\}\},\n\n[^\n]+/,
          'Hi {{recipient_name}},\n\nI was just going through {{website_domain}} and really appreciated your recent work.'
        );
        break;
      }
      case 'Improve Call to Action': {
        newBody = newBody.replace(
          /Would you be open[^\n]+\n\n/i,
          'Do you have 2 minutes this week to see if this is a good fit?\n\n'
        );
        break;
      }
      case 'Change Tone': {
        if (tone) {
          newBody = `${newBody}\n\n[Adjusted for ${tone} tone]`;
        }
        break;
      }
      case 'Custom Instructions':
      default: {
        if (customInstructions) {
          newBody = `${newBody}\n\nPS: ${customInstructions}`;
        }
        break;
      }
    }

    return { subject: newSubject, body: newBody };
  }

  const prompt = `You are an expert outreach copywriter for LINKORA. Modify the provided outreach email template according to the requested action.

ORIGINAL TEMPLATE:
Subject: ${subject}
Body:
${body}

MODIFICATION REQUEST:
- Action: ${action}
${tone ? `- Target Tone: ${tone}` : ''}
${customInstructions ? `- User Instructions: "${customInstructions}"` : ''}

CRITICAL RULES:
1. You MUST PRESERVE all dynamic placeholders:
   - {{recipient_name}}
   - {{company_name}}
   - {{website_domain}}
   - {{sender_name}}
   - {{your_website}}
2. Preserve the greeting pattern ("Hi {{recipient_name}}," or "Hello {{recipient_name}},") so fallback replacement works.
3. Keep the output as clean plain text with no Markdown formatting symbols (**bold**, *italics*).
4. Return ONLY valid JSON:
   {
     "subject": "Modified subject line with placeholders",
     "body": "Modified email body with placeholders"
   }`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an email template editor that outputs structured JSON.'
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6,
      max_tokens: 600
    });

    const content = response.choices?.[0]?.message?.content?.trim();
    if (content) {
      const parsed = JSON.parse(content);
      if (parsed.subject && parsed.body) {
        return {
          subject: String(parsed.subject).trim(),
          body: String(parsed.body).trim()
        };
      }
    }
  } catch (err) {
    console.warn('[bulkEmailService] OpenAI modify failed, falling back:', err.message);
  }

  return { subject, body };
}

/**
 * Cleanly personalizes subject and body for a single prospect.
 * Handles missing recipient names with natural neutral greetings.
 */
export function personalizeForProspect({
  subjectTemplate = '',
  bodyTemplate = '',
  prospect = {},
  yourWebsite = '',
  senderName = '',
  campaignName = ''
}) {
  const p = prospect.prospect || prospect;
  const domain = (p.prospectDomain || p.domain || '').trim().toLowerCase();

  // Resolve recipient contact name
  let rawName = (p.contactName || prospect.contactName || '').trim();
  if (!rawName && p.contactEmails && p.contactEmails.length > 0) {
    const firstNamed = p.contactEmails.find((c) => c && c.name && c.name.trim());
    if (firstNamed) rawName = firstNamed.name.trim();
  }

  // Derive recipient company name
  let company = (p.companyName || prospect.companyName || '').trim();
  if (!company && domain) {
    const namePart = domain.split('.')[0];
    company = namePart.charAt(0).toUpperCase() + namePart.slice(1);
  }
  if (!company) company = 'your team';

  // Resolve contact email
  let recipientEmail = (p.contactEmail || prospect.contactEmail || '').trim().toLowerCase();
  if (!recipientEmail && p.contactEmails && p.contactEmails.length > 0) {
    const firstWithEmail = p.contactEmails.find((c) => c && c.email);
    if (firstWithEmail) recipientEmail = firstWithEmail.email.trim().toLowerCase();
  }

  const effectiveYourWebsite = (yourWebsite || 'our website').trim();
  const effectiveSenderName = (senderName || 'The Team').trim();
  const effectiveDomain = domain || 'your website';

  let renderedSubject = subjectTemplate;
  let renderedBody = bodyTemplate;

  // 1. GREETING & RECIPIENT NAME RESOLUTION:
  // If recipient name is missing or empty, replace "Hi {{recipient_name}}," with neutral greeting ("Hi there," or "Hi [Domain] Team,")
  if (rawName) {
    // Normal replacement when name exists
    renderedSubject = renderedSubject
      .replace(/\{\{\s*recipient_name\s*\}\}/gi, rawName)
      .replace(/\{\{\s*contactName\s*\}\}/gi, rawName);

    renderedBody = renderedBody
      .replace(/\{\{\s*recipient_name\s*\}\}/gi, rawName)
      .replace(/\{\{\s*contactName\s*\}\}/gi, rawName);
  } else {
    // Missing recipient name: use neutral greeting instead of an empty space or broken "Hi ,"
    const teamGreeting = company && company !== 'your team' ? `${company} Team` : (domain ? `${domain} Team` : 'there');

    renderedBody = renderedBody
      // Patterns: "Hi {{recipient_name}}," -> "Hi [Company] Team," or "Hi there,"
      .replace(/Hi\s+\{\{\s*(?:recipient_name|contactName)\s*\}\}\s*,/gi, `Hi ${teamGreeting},`)
      .replace(/Hello\s+\{\{\s*(?:recipient_name|contactName)\s*\}\}\s*,/gi, `Hello ${teamGreeting},`)
      .replace(/Dear\s+\{\{\s*(?:recipient_name|contactName)\s*\}\}\s*,/gi, `Dear ${teamGreeting},`)
      .replace(/Hey\s+\{\{\s*(?:recipient_name|contactName)\s*\}\}\s*,/gi, `Hey there,`)
      // Any remaining standalone {{recipient_name}}
      .replace(/\{\{\s*(?:recipient_name|contactName)\s*\}\}/gi, 'there');

    renderedSubject = renderedSubject
      .replace(/\{\{\s*(?:recipient_name|contactName)\s*\}\}/gi, company || effectiveDomain);
  }

  // 2. COMPANY NAME
  renderedSubject = renderedSubject
    .replace(/\{\{\s*company_name\s*\}\}/gi, company)
    .replace(/\{\{\s*companyName\s*\}\}/gi, company);
  renderedBody = renderedBody
    .replace(/\{\{\s*company_name\s*\}\}/gi, company)
    .replace(/\{\{\s*companyName\s*\}\}/gi, company);

  // 3. WEBSITE DOMAIN
  renderedSubject = renderedSubject
    .replace(/\{\{\s*website_domain\s*\}\}/gi, effectiveDomain)
    .replace(/\{\{\s*prospectDomain\s*\}\}/gi, effectiveDomain);
  renderedBody = renderedBody
    .replace(/\{\{\s*website_domain\s*\}\}/gi, effectiveDomain)
    .replace(/\{\{\s*prospectDomain\s*\}\}/gi, effectiveDomain);

  // 4. SENDER NAME
  renderedSubject = renderedSubject
    .replace(/\{\{\s*sender_name\s*\}\}/gi, effectiveSenderName)
    .replace(/\{\{\s*senderName\s*\}\}/gi, effectiveSenderName);
  renderedBody = renderedBody
    .replace(/\{\{\s*sender_name\s*\}\}/gi, effectiveSenderName)
    .replace(/\{\{\s*senderName\s*\}\}/gi, effectiveSenderName);

  // 5. YOUR WEBSITE
  renderedSubject = renderedSubject
    .replace(/\{\{\s*your_website\s*\}\}/gi, effectiveYourWebsite)
    .replace(/\{\{\s*websiteName\s*\}\}/gi, effectiveYourWebsite);
  renderedBody = renderedBody
    .replace(/\{\{\s*your_website\s*\}\}/gi, effectiveYourWebsite)
    .replace(/\{\{\s*websiteName\s*\}\}/gi, effectiveYourWebsite);

  // 6. CAMPAIGN NAME (if present in template)
  if (campaignName) {
    renderedSubject = renderedSubject.replace(/\{\{\s*campaignName\s*\}\}/gi, campaignName);
    renderedBody = renderedBody.replace(/\{\{\s*campaignName\s*\}\}/gi, campaignName);
  }

  // Final cleanup of any unmapped {{...}} tokens
  renderedSubject = renderedSubject.replace(/\{\{\s*[\w.-]+\s*\}\}/g, '').trim();
  renderedBody = renderedBody.replace(/\{\{\s*[\w.-]+\s*\}\}/g, '').trim();

  return {
    prospectId: String(p._id || p.id || prospect.id || ''),
    assignmentId: prospect.assignmentId ? String(prospect.assignmentId) : null,
    domain: effectiveDomain,
    companyName: company,
    recipientName: rawName || teamGreetingFallback(company, domain),
    hasName: Boolean(rawName),
    recipientEmail,
    subject: renderedSubject,
    body: renderedBody
  };
}

function teamGreetingFallback(company, domain) {
  if (company && company !== 'your team') return `${company} Team`;
  if (domain) return `${domain} Team`;
  return 'Team';
}

/**
 * Format plain text into clean, modern email HTML
 */
function formatHtmlEmail(text) {
  const paragraphs = text.split(/\n\s*\n/).filter(Boolean);
  const htmlParagraphs = paragraphs.map((p) => {
    const formatted = p.replace(/\n/g, '<br />');
    return `<p style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1f2937;">${formatted}</p>`;
  });

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff;">
${htmlParagraphs.join('\n')}
</body>
</html>`;
}

/**
 * Delay execution for rate limit pacing
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Send personalized individual emails in bulk to all selected prospects.
 * Never groups recipients in CC/BCC. Reuses existing Gmail OAuth integration.
 */
export async function sendBulkEmails({
  userId,
  websiteId,
  campaignId = null,
  subjectTemplate = '',
  bodyTemplate = '',
  prospects = [],
  senderName = '',
  yourWebsite = '',
  campaignName = ''
}) {
  if (!prospects || prospects.length === 0) {
    const err = new Error('No prospects selected for bulk sending.');
    err.status = 400;
    throw err;
  }

  // 1. Verify user's connected Gmail account
  const account = await ConnectedEmailAccount.findOne({
    userId,
    provider: 'gmail',
    status: 'connected'
  });

  if (!account) {
    const err = new Error(
      'No active Gmail account is connected. Please connect your Gmail account in Email Settings before sending.'
    );
    err.status = 400;
    err.code = 'EMAIL_NOT_CONNECTED';
    throw err;
  }

  const results = [];
  let sentCount = 0;
  let failedCount = 0;

  // Process sequentially with 200ms delay to respect Gmail rate limits
  for (let i = 0; i < prospects.length; i++) {
    const rawProspect = prospects[i];
    const personalized = personalizeForProspect({
      subjectTemplate,
      bodyTemplate,
      prospect: rawProspect,
      yourWebsite,
      senderName: senderName || account.metadata?.name || '',
      campaignName
    });

    const recipientEmail = (personalized.recipientEmail || '').trim().toLowerCase();

    // Check if valid email address exists
    if (!recipientEmail || !recipientEmail.includes('@')) {
      failedCount++;
      results.push({
        prospectId: personalized.prospectId,
        assignmentId: personalized.assignmentId,
        domain: personalized.domain,
        companyName: personalized.companyName,
        recipientName: personalized.recipientName,
        recipientEmail: recipientEmail || 'missing@recipient.domain',
        status: 'failed',
        error: 'Missing or invalid recipient email address.',
        emailId: null
      });
      continue;
    }

    // Prepare OutreachEmail document
    let outreachRecord = null;
    try {
      const pId = mongoose.Types.ObjectId.isValid(personalized.prospectId)
        ? new mongoose.Types.ObjectId(personalized.prospectId)
        : null;

      const wId = websiteId && mongoose.Types.ObjectId.isValid(websiteId)
        ? new mongoose.Types.ObjectId(websiteId)
        : (account.websiteId || null);

      const cId = campaignId && mongoose.Types.ObjectId.isValid(campaignId)
        ? new mongoose.Types.ObjectId(campaignId)
        : null;

      const aId = personalized.assignmentId && mongoose.Types.ObjectId.isValid(personalized.assignmentId)
        ? new mongoose.Types.ObjectId(personalized.assignmentId)
        : null;

      if (!pId) {
        throw new Error('Invalid Prospect ID for outreach email.');
      }

      const htmlBody = formatHtmlEmail(personalized.body);

      outreachRecord = new OutreachEmail({
        userId,
        websiteId: wId || pId, // Fallback to prospect object if websiteId not provided
        campaignId: cId,
        prospectId: pId,
        assignmentId: aId,
        connectedAccountId: account._id,
        recipientEmail,
        recipientName: personalized.recipientName,
        senderEmail: account.email,
        senderName: senderName || account.metadata?.name || '',
        subject: personalized.subject,
        bodyHtml: htmlBody,
        bodyText: personalized.body,
        status: 'pending'
      });

      await outreachRecord.save();

      // Dispatch via Gmail API
      const sendResult = await gmailService.sendEmail({
        userId,
        to: recipientEmail,
        subject: personalized.subject,
        htmlBody,
        textBody: personalized.body,
        trackingId: outreachRecord.trackingId
      });

      // Update outreach record to sent
      outreachRecord.status = 'sent';
      outreachRecord.gmailMessageId = sendResult.messageId;
      outreachRecord.gmailThreadId = sendResult.threadId;
      outreachRecord.sentAt = new Date();
      await outreachRecord.save();

      // Update CampaignProspectAssignment to contacted if assignment exists
      if (aId) {
        await CampaignProspectAssignment.findByIdAndUpdate(aId, {
          $set: {
            outreachStatus: 'contacted',
            contactedAt: new Date()
          },
          $inc: { emailsSentCount: 1 }
        });
      } else if (cId && pId) {
        await CampaignProspectAssignment.findOneAndUpdate(
          { campaignId: cId, prospectId: pId },
          {
            $set: {
              outreachStatus: 'contacted',
              contactedAt: new Date()
            },
            $inc: { emailsSentCount: 1 }
          }
        );
      }

      // Record EmailActivity for outreach history
      try {
        await EmailActivity.create({
          userId,
          websiteId: outreachRecord.websiteId,
          campaignId: cId,
          prospectId: pId,
          outreachEmailId: outreachRecord._id,
          eventType: 'sent',
          description: `Outreach email sent to ${recipientEmail} via bulk automation`
        });
      } catch (actErr) {
        console.warn('[bulkEmailService] Failed to record email activity:', actErr.message);
      }

      sentCount++;
      results.push({
        prospectId: personalized.prospectId,
        assignmentId: personalized.assignmentId,
        domain: personalized.domain,
        companyName: personalized.companyName,
        recipientName: personalized.recipientName,
        recipientEmail,
        status: 'sent',
        messageId: sendResult.messageId,
        emailId: outreachRecord._id
      });
    } catch (sendErr) {
      console.error(`[bulkEmailService] Failed to send to ${recipientEmail}:`, sendErr.message);
      failedCount++;

      if (outreachRecord) {
        outreachRecord.status = 'failed';
        outreachRecord.errorMessage = sendErr.message || 'Send failed';
        outreachRecord.failedAt = new Date();
        await outreachRecord.save();

        try {
          await EmailActivity.create({
            userId,
            websiteId: outreachRecord.websiteId,
            campaignId: outreachRecord.campaignId,
            prospectId: outreachRecord.prospectId,
            outreachEmailId: outreachRecord._id,
            eventType: 'failed',
            description: `Failed to send email to ${recipientEmail}: ${sendErr.message}`
          });
        } catch {
          // Ignore secondary activity error
        }
      }

      results.push({
        prospectId: personalized.prospectId,
        assignmentId: personalized.assignmentId,
        domain: personalized.domain,
        companyName: personalized.companyName,
        recipientName: personalized.recipientName,
        recipientEmail,
        status: 'failed',
        error: sendErr.message || 'Failed to dispatch email via Gmail API',
        emailId: outreachRecord?._id || null
      });
    }

    // Rate pacing between sends
    if (i < prospects.length - 1) {
      await delay(200);
    }
  }

  return {
    total: prospects.length,
    sentCount,
    failedCount,
    pendingCount: 0,
    results
  };
}

/**
 * Retry an individual failed email dispatch
 */
export async function retrySingleEmail({
  userId,
  emailId,
  websiteId,
  campaignId,
  prospect,
  subject,
  body,
  recipientEmail,
  senderName
}) {
  const account = await ConnectedEmailAccount.findOne({
    userId,
    provider: 'gmail',
    status: 'connected'
  });

  if (!account) {
    const err = new Error('No active Gmail account is connected.');
    err.status = 400;
    throw err;
  }

  let outreachRecord = null;
  if (emailId && mongoose.Types.ObjectId.isValid(emailId)) {
    outreachRecord = await OutreachEmail.findOne({ _id: emailId, userId });
  }

  const effectiveEmail = (
    recipientEmail ||
    outreachRecord?.recipientEmail ||
    prospect?.contactEmail ||
    ''
  ).trim().toLowerCase();

  if (!effectiveEmail || !effectiveEmail.includes('@')) {
    const err = new Error('Cannot retry: Missing or invalid recipient email address.');
    err.status = 400;
    throw err;
  }

  const effectiveSubject = subject || outreachRecord?.subject || 'Outreach Inquiry';
  const effectiveBody = body || outreachRecord?.bodyText || '';
  const htmlBody = formatHtmlEmail(effectiveBody);

  if (!outreachRecord) {
    const pId = prospect?.id || prospect?._id;
    outreachRecord = new OutreachEmail({
      userId,
      websiteId: websiteId || (pId && mongoose.Types.ObjectId.isValid(pId) ? pId : null),
      campaignId: campaignId || null,
      prospectId: pId,
      assignmentId: prospect?.assignmentId || null,
      connectedAccountId: account._id,
      recipientEmail: effectiveEmail,
      recipientName: prospect?.recipientName || prospect?.contactName || '',
      senderEmail: account.email,
      senderName: senderName || account.metadata?.name || '',
      subject: effectiveSubject,
      bodyHtml: htmlBody,
      bodyText: effectiveBody,
      status: 'pending'
    });
    await outreachRecord.save();
  }

  try {
    const sendResult = await gmailService.sendEmail({
      userId,
      to: effectiveEmail,
      subject: effectiveSubject,
      htmlBody,
      textBody: effectiveBody,
      trackingId: outreachRecord.trackingId
    });

    outreachRecord.status = 'sent';
    outreachRecord.gmailMessageId = sendResult.messageId;
    outreachRecord.gmailThreadId = sendResult.threadId;
    outreachRecord.sentAt = new Date();
    outreachRecord.errorMessage = '';
    await outreachRecord.save();

    // Update assignment if linked
    if (outreachRecord.assignmentId) {
      await CampaignProspectAssignment.findByIdAndUpdate(outreachRecord.assignmentId, {
        $set: {
          outreachStatus: 'contacted',
          contactedAt: new Date()
        },
        $inc: { emailsSentCount: 1 }
      });
    }

    try {
      await EmailActivity.create({
        userId,
        websiteId: outreachRecord.websiteId,
        campaignId: outreachRecord.campaignId,
        prospectId: outreachRecord.prospectId,
        outreachEmailId: outreachRecord._id,
        eventType: 'sent',
        description: `Retry successful: Email sent to ${effectiveEmail}`
      });
    } catch {
      // Activity error ignored
    }

    return {
      success: true,
      status: 'sent',
      emailId: outreachRecord._id,
      messageId: sendResult.messageId,
      recipientEmail: effectiveEmail
    };
  } catch (err) {
    outreachRecord.status = 'failed';
    outreachRecord.errorMessage = err.message;
    outreachRecord.failedAt = new Date();
    await outreachRecord.save();

    return {
      success: false,
      status: 'failed',
      emailId: outreachRecord._id,
      error: err.message,
      recipientEmail: effectiveEmail
    };
  }
}
