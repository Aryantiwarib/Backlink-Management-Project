/**
 * Dynamic Template Engine for LINKORA Outreach Emails
 * Safely replaces dynamic placeholders with prospect, campaign, website, and sender data.
 */

export const SUPPORTED_PLACEHOLDERS = [
  '{{contactName}}',
  '{{websiteName}}',
  '{{prospectDomain}}',
  '{{campaignName}}',
  '{{senderName}}'
];

/**
 * Extract likely contact name from an email address or title
 * e.g. "john.doe@example.com" -> "John"
 */
export function extractFallbackContactName(email = '', title = '') {
  if (email && typeof email === 'string' && email.includes('@')) {
    const userPart = email.split('@')[0];
    const words = userPart.replace(/[._-]/g, ' ').trim().split(/\s+/);
    const genericRoles = ['info', 'contact', 'admin', 'hello', 'support', 'editor', 'press', 'team', 'sales', 'help', 'mail'];

    const candidate = words.find((w) => w && !genericRoles.includes(w.toLowerCase()));
    if (candidate) {
      return candidate.charAt(0).toUpperCase() + candidate.slice(1).toLowerCase();
    }
  }
  if (title && typeof title === 'string' && title.trim()) {
    const words = title.trim().split(/\s+/);
    if (words.length <= 3) return words[0];
  }
  return 'there';
}

/**
 * Replace all placeholders in a string template
 */
export function replacePlaceholders(text = '', context = {}) {
  if (!text || typeof text !== 'string') return '';

  const {
    contactName,
    websiteName,
    prospectDomain,
    campaignName,
    senderName,
    prospectUrl
  } = context;

  let result = text;

  // 1. {{contactName}}
  const resolvedContact = (contactName && String(contactName).trim()) ? contactName.trim() : 'there';
  result = result.replace(/\{\{\s*contactName\s*\}\}/gi, resolvedContact);

  // 2. {{websiteName}}
  const resolvedWebsite = (websiteName && String(websiteName).trim()) ? websiteName.trim() : 'our website';
  result = result.replace(/\{\{\s*websiteName\s*\}\}/gi, resolvedWebsite);

  // 3. {{prospectDomain}}
  const resolvedDomain = (prospectDomain && String(prospectDomain).trim()) ? prospectDomain.trim() : 'your site';
  result = result.replace(/\{\{\s*prospectDomain\s*\}\}/gi, resolvedDomain);

  // 4. {{campaignName}}
  const resolvedCampaign = (campaignName && String(campaignName).trim()) ? campaignName.trim() : 'our collaboration';
  result = result.replace(/\{\{\s*campaignName\s*\}\}/gi, resolvedCampaign);

  // 5. {{senderName}}
  const resolvedSender = (senderName && String(senderName).trim()) ? senderName.trim() : 'The Team';
  result = result.replace(/\{\{\s*senderName\s*\}\}/gi, resolvedSender);

  // Optional: {{prospectUrl}}
  if (prospectUrl) {
    result = result.replace(/\{\{\s*prospectUrl\s*\}\}/gi, prospectUrl.trim());
  }

  // Final sanity sweep: ensure no raw "{{...}}" or "undefined"/"null" remains
  result = result.replace(/\{\{\s*[\w.-]+\s*\}\}/g, '');

  return result;
}

/**
 * Render personalized email subject and body for a prospect
 */
export function renderOutreachContent({
  template,
  subject,
  body,
  prospect,
  website,
  campaign,
  user,
  senderName: customSender
}) {
  const rawSubject = subject || template?.subject || '';
  const rawBody = body || template?.body || '';

  const recipientEmail = prospect?.contactEmail || '';
  const fallbackName = extractFallbackContactName(recipientEmail, prospect?.title);

  const context = {
    contactName: prospect?.contactName || fallbackName,
    websiteName: website?.name || website?.domain || '',
    prospectDomain: prospect?.prospectDomain || (prospect?.prospectUrl ? new URL(prospect.prospectUrl).hostname : ''),
    campaignName: campaign?.name || '',
    senderName: customSender || user?.name || user?.email?.split('@')[0] || 'Linkora Outreach',
    prospectUrl: prospect?.prospectUrl || ''
  };

  const renderedSubject = replacePlaceholders(rawSubject, context);
  const renderedBody = replacePlaceholders(rawBody, context);

  return {
    subject: renderedSubject,
    body: renderedBody,
    context
  };
}
