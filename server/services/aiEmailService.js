import OpenAI from 'openai';

/**
 * Get or initialize OpenAI client using existing backend environment variables
 */
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    return null;
  }
  return new OpenAI({ apiKey });
}

/**
 * Word count guideline based on requested length
 */
const LENGTH_GUIDES = {
  Short: 'Keep the entire email body very concise (around 50-90 words). Max 2 short paragraphs.',
  Medium: 'Keep the email body balanced and focused (around 100-160 words). 2-3 concise paragraphs.',
  Detailed: 'Provide a thoughtful, comprehensive email with clear context (around 175-250 words). 3-4 structured paragraphs.'
};

/**
 * Tone styling instructions
 */
const TONE_GUIDES = {
  Professional: 'Polite, clear, respectful, business-appropriate, and direct.',
  Friendly: 'Warm, personable, conversational, and approachable while maintaining professional credibility.',
  Formal: 'Structured, traditional, courteous, and respectful of business hierarchy.',
  Casual: 'Relaxed, conversational, modern, and friendly without being sloppy.',
  Persuasive: 'Emphasize mutual win, compelling reasons to collaborate, and tangible reader value.',
  Confident: 'Direct, authoritative, clear on value, without sounding arrogant or pushy.',
  'Natural and Human': 'Sounds like an email written by a thoughtful individual in 2 minutes. Completely free of corporate clichés, fake flattery, and marketing buzzwords.',
  'Follow-up': 'Polite reminder, referencing previous context cleanly without being aggressive or passive-aggressive.'
};

/**
 * Purpose guidelines
 */
const PURPOSE_GUIDES = {
  'Backlink Request': 'Propose adding a link to your resource or content where it genuinely enriches an existing piece.',
  'Guest Post Outreach': 'Pitch 1-2 specific, high-relevance article topics that fit the recipient site’s audience.',
  'Link Insertion Request': 'Suggest inserting a relevant reference link into a specific existing article or resource guide.',
  'Collaboration Request': 'Propose an editorial or co-marketing collaboration between both websites.',
  'Partnership Proposal': 'Present a strategic partnership proposal with reciprocal benefits for both brands.',
  'First Outreach': 'Introduce yourself, compliment a genuine specific angle of their work, and state your outreach objective concisely.',
  'Follow-up Email': 'Politely check in on a previous message, adding a small piece of value or a simple question.',
  'Custom Email': 'Follow the specific user instructions provided.'
};

/**
 * Construct system instructions ensuring realistic, human, high-converting outreach
 */
function buildEmailSystemPrompt() {
  return `You are the LINKORA AI Outreach Email Studio engine. You specialize in generating high-performing, authentic, human-written link-building and SEO outreach emails.

CORE ETHICAL & ACCURACY RULES:
1. NEVER INVENT FACTS:
   - Do not hallucinate recipient achievements, fake awards, or specific article quotes that were not provided.
   - Do not claim you read a specific article unless an article title or URL is explicitly given in the context.
   - If the recipient's name is not provided, use a clean generic greeting (e.g., "Hi there," or "Hi [Website] Team,") instead of inventing a fake name.
2. NO SPAMMY TEMPLATES OR FLUFF:
   - Ban generic cliches like: "I hope this email finds you well", "I was browsing your website and fell in love", "My name is X and I am reaching out because...", "In today's fast-paced digital world".
   - Get straight to the point with a natural, human opening.
3. CLEAR VALUE PROPOSITION:
   - Every outreach pitch must articulate why the recipient or their readers benefit.
4. INDIVIDUALLY CRAFTED:
   - Emails must read like a personal 1-to-1 message sent by a thoughtful specialist.
5. CLEAN FORMATTING:
   - Return plain text email body with clean paragraph breaks (no markdown formatting symbols like **bold** in the subject or body, standard capitalization).
6. STRUCTURED JSON OUTPUT:
   - You must always respond with valid JSON matching the exact schema requested.`;
}

/**
 * Deterministic fallback generator when OpenAI key is missing or in offline test environments
 */
function generateFallbackEmail({
  recipientName,
  recipientWebsite,
  companyName,
  emailPurpose,
  tone: _tone,
  emailLength,
  customInstructions: _customInstructions,
  websiteDomain,
  campaignName: _campaignName,
  senderName,
  variationsCount = 1
}) {
  const greeting = recipientName ? `Hi ${recipientName},` : `Hi ${companyName || recipientWebsite || 'there'},`;
  const myDomain = websiteDomain || 'our website';
  const targetSite = recipientWebsite || companyName || 'your site';
  const signoff = senderName ? `Best regards,\n${senderName}` : 'Best regards,\nContent Partnerships';

  const templates = [
    {
      subject: emailPurpose === 'Guest Post Outreach'
        ? `Guest contribution idea for ${targetSite}`
        : emailPurpose === 'Link Insertion Request'
        ? `Quick resource suggestion for ${targetSite}`
        : `Quick question regarding ${targetSite}`,
      opening: `I recently came across ${targetSite} while researching content in our space and wanted to reach out directly.`,
      valueProposition: `We recently published an in-depth, original research guide on ${myDomain} that provides detailed benchmarks relevant to your audience.`,
      callToAction: `Would you be open to taking a quick look if I sent over a 2-sentence summary?`
    },
    {
      subject: emailPurpose === 'Guest Post Outreach'
        ? `Fresh article pitches for ${targetSite}`
        : emailPurpose === 'Follow-up Email'
        ? `Following up on our collaboration note`
        : `Connecting regarding ${myDomain} & ${targetSite}`,
      opening: `Reaching out from the content team at ${myDomain}. We've been following your publications on ${targetSite}.`,
      valueProposition: `We have prepared an actionable data-backed breakdown that aligns with topics you frequently cover, designed to be genuinely useful for your readers.`,
      callToAction: `Let me know if this sounds like something you'd be interested in exploring together.`
    },
    {
      subject: `Resource collaboration idea with ${targetSite}`,
      opening: `I wanted to drop a quick note regarding your recent coverage on ${targetSite}.`,
      valueProposition: `We've assembled a comprehensive resource on ${myDomain} that addresses key questions your readers often encounter.`,
      callToAction: `Happy to share a quick preview if you are currently open to new editorial contributions.`
    }
  ];

  const count = Math.min(Math.max(1, variationsCount), 3);
  const variations = [];

  for (let i = 0; i < count; i++) {
    const t = templates[i % templates.length];
    const paragraphs = [
      greeting,
      t.opening,
      t.valueProposition,
      t.callToAction,
      signoff
    ];

    if (emailLength === 'Short') {
      // Condense
      const shortBody = `${greeting}\n\n${t.opening} ${t.valueProposition}\n\n${t.callToAction}\n\n${signoff}`;
      variations.push({
        variationId: `var-${i + 1}`,
        subject: t.subject,
        body: shortBody,
        opening: t.opening,
        valueProposition: t.valueProposition,
        callToAction: t.callToAction
      });
    } else {
      variations.push({
        variationId: `var-${i + 1}`,
        subject: t.subject,
        body: paragraphs.join('\n\n'),
        opening: t.opening,
        valueProposition: t.valueProposition,
        callToAction: t.callToAction
      });
    }
  }

  return {
    success: true,
    provider: 'fallback_engine',
    model: 'linkora-rule-engine',
    variations
  };
}

/**
 * Generate high-converting outreach email drafts using OpenAI or fallback engine
 *
 * @param {Object} options
 * @param {string} options.recipientName
 * @param {string} options.recipientWebsite
 * @param {string} options.companyName
 * @param {string} [options.recipientEmail]
 * @param {string} options.emailPurpose
 * @param {string} options.tone
 * @param {string} options.emailLength
 * @param {string} [options.customInstructions]
 * @param {Object} [options.prospect]
 * @param {Object} [options.campaign]
 * @param {Object} [options.website]
 * @param {string} [options.senderName]
 * @param {number} [options.variationsCount=1]
 * @param {Function} [options.mockHandler]
 * @returns {Promise<{ success: boolean, provider: string, model: string, variations: Array }>}
 */
export async function generateOutreachEmail({
  recipientName = '',
  recipientWebsite = '',
  companyName = '',
  recipientEmail: _recipientEmail = '',
  emailPurpose = 'Backlink Request',
  tone = 'Professional',
  emailLength = 'Medium',
  customInstructions = '',
  prospect = null,
  campaign = null,
  website = null,
  senderName = '',
  variationsCount = 1,
  mockHandler = null
}) {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  // 1. Support test mock handler
  if (mockHandler && typeof mockHandler === 'function') {
    return await mockHandler({
      recipientName,
      recipientWebsite,
      companyName,
      emailPurpose,
      tone,
      emailLength,
      customInstructions,
      prospect,
      campaign,
      website,
      senderName,
      variationsCount
    });
  }

  // 2. Check OpenAI Client availability
  const client = getOpenAIClient();
  const websiteDomain = website?.domain || website?.url || '';
  const websiteName = website?.name || '';
  const campaignName = campaign?.name || '';
  const campaignObjective = campaign?.objective || '';
  const campaignType = campaign?.campaignType || '';
  const prospectDomain = prospect?.prospectDomain || recipientWebsite || '';
  const prospectUrl = prospect?.prospectUrl || '';
  const prospectNotes = prospect?.notes || '';
  const prospectNiche = prospect?.relevanceCategory || campaign?.niche || '';

  if (!client) {
    // Graceful offline fallback
    return generateFallbackEmail({
      recipientName,
      recipientWebsite: prospectDomain,
      companyName,
      emailPurpose,
      tone,
      emailLength,
      customInstructions,
      websiteDomain,
      campaignName,
      senderName,
      variationsCount
    });
  }

  // 3. Assemble Prompt
  const numVariations = Math.min(Math.max(1, parseInt(variationsCount, 10) || 1), 3);

  const userPrompt = `Generate ${numVariations} distinct, high-quality email variation(s) for a backlink outreach campaign.

RECIPIENT & TARGET DETAILS:
- Recipient Contact Name: ${recipientName || 'Not specified (use polite team/website greeting)'}
- Recipient Target Website: ${prospectDomain || 'Not specified'}
- Company / Brand Name: ${companyName || 'Not specified'}
- Target Specific Page URL: ${prospectUrl || 'Not specified'}
- Known Notes on Prospect: ${prospectNotes || 'None'}

SENDER & CAMPAIGN CONTEXT:
- Sender Website Domain: ${websiteDomain || 'Our website'}
- Sender Website Brand: ${websiteName || websiteDomain || 'Our team'}
- Sender Contact Name: ${senderName || 'Our Content Specialist'}
- Outreach Campaign Name: ${campaignName || 'Link Partnership'}
- Campaign Category: ${campaignType || emailPurpose}
- Campaign Objective: ${campaignObjective || emailPurpose}
- Niche / Industry: ${prospectNiche || 'Digital & Web'}

CONFIGURATION PARAMETERS:
- Email Outreach Purpose: ${emailPurpose} (${PURPOSE_GUIDES[emailPurpose] || 'Direct partnership'})
- Tone of Voice: ${tone} (${TONE_GUIDES[tone] || 'Natural and professional'})
- Length Requirement: ${emailLength} (${LENGTH_GUIDES[emailLength] || 'Concise'})
${customInstructions ? `- Custom Instructions: "${customInstructions}"` : ''}

OUTPUT FORMAT REQUIREMENTS:
You MUST respond with a strict JSON object with this EXACT structure:
{
  "variations": [
    {
      "variationId": "var-1",
      "subject": "Compelling, non-spammy subject line without quotes",
      "body": "Complete email body including greeting, opening, value proposition, outreach request, call to action, and professional closing with sender name",
      "opening": "The first 1-2 opening sentences",
      "valueProposition": "The core value proposition sentence(s)",
      "callToAction": "The closing call to action question"
    }
  ]
}

Ensure each variation has a DIFFERENT subject line and distinct phrasing while pursuing the same goal.`;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: buildEmailSystemPrompt() },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.75,
      max_tokens: 1500
    });

    const rawContent = response.choices?.[0]?.message?.content?.trim();
    if (!rawContent) {
      throw new Error('Received empty response from OpenAI');
    }

    const parsed = JSON.parse(rawContent);
    const variations = Array.isArray(parsed.variations) && parsed.variations.length > 0
      ? parsed.variations
      : [
          {
            variationId: 'var-1',
            subject: parsed.subject || `Connecting with ${prospectDomain || 'your team'}`,
            body: parsed.body || parsed.email || '',
            opening: parsed.opening || '',
            valueProposition: parsed.valueProposition || '',
            callToAction: parsed.callToAction || ''
          }
        ];

    return {
      success: true,
      provider: 'openai',
      model,
      usage: response.usage || {},
      variations
    };
  } catch (err) {
    console.error('[aiEmailService] OpenAI generation error:', err.message);
    // If OpenAI fails or rate limits, fallback gracefully
    return generateFallbackEmail({
      recipientName,
      recipientWebsite: prospectDomain,
      companyName,
      emailPurpose,
      tone,
      emailLength,
      customInstructions,
      websiteDomain,
      campaignName,
      senderName,
      variationsCount
    });
  }
}

/**
 * Modify an existing email draft without regenerating from scratch
 *
 * Supported Actions:
 * - change_tone: Rewrite with a new tone
 * - make_shorter: Trim to be more concise
 * - make_longer: Expand with relevant detail
 * - make_more_persuasive: Amplify value proposition & benefits
 * - make_more_natural: Eliminate stiff phrasing and make human
 * - improve_opening: Craft a stronger hook
 * - improve_cta: Sharpen the closing call to action
 * - rewrite_email: Complete fresh rewrite with same parameters
 * - rewrite_selected: Rewrite specific selected substring
 * - custom_instructions: Apply custom prompt command
 *
 * @param {Object} options
 * @param {string} options.currentSubject
 * @param {string} options.currentBody
 * @param {string} options.action
 * @param {string} [options.tone]
 * @param {string} [options.customInstructions]
 * @param {string} [options.selectedText]
 * @param {string} [options.targetField='both'] - 'subject', 'body', or 'both'
 * @param {Object} [options.context]
 * @param {Function} [options.mockHandler]
 * @returns {Promise<{ success: boolean, subject: string, body: string, actionTaken: string }>}
 */
export async function modifyOutreachEmail({
  currentSubject = '',
  currentBody = '',
  action = 'rewrite_email',
  tone = 'Professional',
  customInstructions = '',
  selectedText = '',
  targetField = 'both',
  context = {},
  mockHandler = null
}) {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  if (mockHandler && typeof mockHandler === 'function') {
    return await mockHandler({
      currentSubject,
      currentBody,
      action,
      tone,
      customInstructions,
      selectedText,
      targetField,
      context
    });
  }

  const client = getOpenAIClient();

  // If no OpenAI client, perform deterministic rule-based modification
  if (!client) {
    return fallbackModifyEmail({
      currentSubject,
      currentBody,
      action,
      tone,
      customInstructions,
      selectedText,
      targetField
    });
  }

  let actionInstruction = '';
  switch (action) {
    case 'change_tone':
      actionInstruction = `Change the tone of voice to "${tone}". Follow this tone guidance: ${TONE_GUIDES[tone] || 'natural and appropriate'}.`;
      break;
    case 'make_shorter':
      actionInstruction = `Make the email body significantly more concise and punchy. Cut unnecessary preamble, keep sentences short and impactful, and reduce word count by 30-40%.`;
      break;
    case 'make_longer':
      actionInstruction = `Expand the email with more helpful context and a clearer explanation of the value proposition, while maintaining natural flow without adding filler.`;
      break;
    case 'make_more_persuasive':
      actionInstruction = `Make the email more persuasive and compelling. Emphasize why collaborating provides clear, immediate value to the recipient and their audience.`;
      break;
    case 'make_more_natural':
      actionInstruction = `Make the email sound completely human, conversational, and direct. Remove any robotic phrasing, marketing jargon, or fake flattery.`;
      break;
    case 'improve_opening':
      actionInstruction = `Rewrite the opening paragraph to be more engaging, relevant, and original. Hook the reader immediately.`;
      break;
    case 'improve_cta':
      actionInstruction = `Improve the closing call-to-action (CTA). Make it low-friction, specific, and easy for the recipient to reply with a simple 'yes'.`;
      break;
    case 'rewrite_selected':
      actionInstruction = `In the email body, locate the selected snippet: "${selectedText}". Rewrite this specific part to be much clearer and more impactful, integrating smoothly into the surrounding text.`;
      break;
    case 'custom_instructions':
      actionInstruction = `Apply these specific modification instructions requested by the user: "${customInstructions}".`;
      break;
    case 'rewrite_email':
    default:
      actionInstruction = `Rewrite the email with fresh wording and a new angle while maintaining the core outreach objective.`;
      break;
  }

  const prompt = `You are editing an outreach email in the LINKORA AI Studio.

CURRENT SUBJECT:
"${currentSubject}"

CURRENT EMAIL BODY:
"""
${currentBody}
"""

TARGET FIELD TO MODIFY: ${targetField.toUpperCase()}

TASK INSTRUCTION:
${actionInstruction}

Return a valid JSON object matching this schema:
{
  "subject": "${targetField === 'body' ? 'UNCHANGED_OR_NEW_SUBJECT' : 'Refined subject line'}",
  "body": "${targetField === 'subject' ? 'UNCHANGED_OR_NEW_BODY' : 'Refined email body'}",
  "summaryOfChange": "Brief 1-sentence note of what was adjusted"
}`;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: buildEmailSystemPrompt() },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1200
    });

    const parsed = JSON.parse(response.choices?.[0]?.message?.content || '{}');
    const newSubject = targetField === 'body' ? currentSubject : (parsed.subject || currentSubject);
    const newBody = targetField === 'subject' ? currentBody : (parsed.body || currentBody);

    return {
      success: true,
      provider: 'openai',
      subject: newSubject.trim(),
      body: newBody.trim(),
      actionTaken: action,
      summaryOfChange: parsed.summaryOfChange || ''
    };
  } catch (err) {
    console.error('[aiEmailService] OpenAI modification error:', err.message);
    return fallbackModifyEmail({
      currentSubject,
      currentBody,
      action,
      tone,
      customInstructions,
      selectedText,
      targetField
    });
  }
}

/**
 * Fallback modification engine when API keys are not present
 */
function fallbackModifyEmail({
  currentSubject,
  currentBody,
  action,
  tone,
  customInstructions: _customInstructions,
  selectedText,
  targetField: _targetField
}) {
  let newSubject = currentSubject;
  let newBody = currentBody;

  if (action === 'make_shorter') {
    // Trim extra spaces and paragraphs
    const lines = currentBody.split('\n\n').filter(Boolean);
    if (lines.length > 3) {
      newBody = [lines[0], lines[1], lines[lines.length - 1]].join('\n\n');
    }
  } else if (action === 'make_longer') {
    newBody = currentBody.replace(
      /(\n\nBest regards|\n\nSincerely|\n\nCheers)/i,
      '\n\nWe would also be delighted to feature your team in an upcoming case study or cross-promotion if that aligns with your goals.$1'
    );
  } else if (action === 'improve_cta') {
    newBody = currentBody.replace(
      /(Would you be open|Let me know|Happy to share)[^\n]+/i,
      'Would you be open to a 2-minute look if I send over the link?'
    );
  } else if (action === 'change_tone' && tone === 'Casual') {
    newSubject = currentSubject.replace(/Regarding/i, 'Quick note on');
    newBody = currentBody.replace(/Dear |Hi /i, 'Hey ').replace(/Best regards/i, 'Cheers');
  } else if (action === 'rewrite_selected' && selectedText && currentBody.includes(selectedText)) {
    newBody = currentBody.replace(selectedText, `${selectedText.trim()} (clarified and refined)`);
  }

  return {
    success: true,
    provider: 'fallback_engine',
    subject: newSubject,
    body: newBody,
    actionTaken: action,
    summaryOfChange: `Applied rule-based ${action}`
  };
}
