import mongoose from 'mongoose';
import Prospect, { normalizeDomain } from '../../models/Prospect.js';
import Campaign from '../../models/Campaign.js';
import CampaignProspectAssignment from '../../models/CampaignProspectAssignment.js';
import { searchDiscoveryProvider } from './providers/searchDiscoveryProvider.js';

// Common dummy / system email patterns and placeholder domains to exclude
const DUMMY_DOMAINS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'domain.com',
  'yourdomain.com',
  'yoursite.com',
  'company.com',
  'mycompany.com',
  'email.com',
  'test.com',
  'sample.com',
  'placeholder.com',
  'sitename.com',
  'sentry.io',
  'wixpress.com',
  'w3.org',
  'schema.org',
  'wordpress.org',
  'cloudflare.com',
  'gravatar.com'
]);

// Exact dummy or template placeholder addresses commonly found in theme mockups
const EXACT_PLACEHOLDERS = new Set([
  'you@company.com',
  'your@company.com',
  'name@company.com',
  'name@domain.com',
  'user@company.com',
  'user@domain.com',
  'email@company.com',
  'email@domain.com',
  'example@example.com',
  'test@test.com',
  'test@domain.com',
  'someone@example.com',
  'someone@domain.com',
  'john.doe@example.com',
  'john.doe@company.com',
  'first.last@company.com',
  'firstname.lastname@company.com',
  'yourname@domain.com',
  'yourname@company.com',
  'sample@domain.com',
  'sample@company.com',
  'admin@domain.com',
  'admin@company.com'
]);

const PLACEHOLDER_USERS = new Set([
  'you',
  'your',
  'yourname',
  'name',
  'username',
  'user',
  'email',
  'test',
  'someone',
  'sample',
  'example',
  'placeholder',
  'first.last',
  'firstname.lastname',
  'john.doe',
  'jane.doe'
]);

const DUMMY_PREFIXES = [
  'noreply@',
  'no-reply@',
  'donotreply@',
  'do-not-reply@',
  'mailer-daemon@',
  'postmaster@',
  'support@wix.com',
  'abuse@',
  'webmaster@'
];

const FILE_EXT_REGEX = /\.(png|jpg|jpeg|gif|webp|svg|css|js|ico|woff|woff2|ttf|eot|mp4|pdf)$/i;

// Email extraction regex
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,10}\b/g;
const MAILTO_REGEX = /mailto:([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,10})/gi;

// Subpaths to check for contact information
const CONTACT_SUBPATHS = [
  '',
  '/contact',
  '/contact-us',
  '/about',
  '/about-us',
  '/team',
  '/write-for-us',
  '/editorial',
  '/guest-post'
];

export class ContactDiscoveryService {
  constructor() {
    this.activeJobs = new Set(); // tracks active campaign discovery jobs
  }

  /**
   * Validate and clean an email candidate
   */
  isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const clean = email.trim().toLowerCase();

    // Length check
    if (clean.length < 6 || clean.length > 100) return false;

    // Reject exact template placeholders
    if (EXACT_PLACEHOLDERS.has(clean)) return false;

    // Reject file extensions disguised as emails
    if (FILE_EXT_REGEX.test(clean)) return false;

    // Check dummy prefixes
    for (const prefix of DUMMY_PREFIXES) {
      if (clean.startsWith(prefix)) return false;
    }

    // Split user and domain
    const parts = clean.split('@');
    if (parts.length !== 2) return false;
    const [user, domain] = parts;

    if (!user || !domain) return false;
    if (DUMMY_DOMAINS.has(domain)) return false;

    // Reject placeholder username + template domain combos (e.g. name@mysite.com, user@testdomain.com)
    if (
      PLACEHOLDER_USERS.has(user) &&
      (domain.includes('company') ||
        domain.includes('domain') ||
        domain.includes('example') ||
        domain.includes('sample') ||
        domain.includes('test') ||
        domain.includes('placeholder'))
    ) {
      return false;
    }

    // Reject special/reserved TLDs
    if (
      domain.endsWith('.example') ||
      domain.endsWith('.test') ||
      domain.endsWith('.invalid') ||
      domain.endsWith('.localhost')
    ) {
      return false;
    }

    // Reject domains without a dot or ending in dot
    if (!domain.includes('.') || domain.endsWith('.')) return false;

    // Basic regex check
    const standardEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}$/;
    return standardEmail.test(clean);
  }

  /**
   * Extract unique valid emails from an HTML string or text snippet
   */
  extractEmails(html, sourceUrl = '', discoveryMethod = 'website_crawl', baseConfidence = 80) {
    if (!html || typeof html !== 'string') return [];

    const foundMap = new Map();

    // 1. Mailto links (highest confidence)
    let mailtoMatch;
    const mailtoRegex = new RegExp(MAILTO_REGEX);
    while ((mailtoMatch = mailtoRegex.exec(html)) !== null) {
      const email = mailtoMatch[1]?.toLowerCase().trim();
      if (this.isValidEmail(email) && !foundMap.has(email)) {
        foundMap.set(email, {
          email,
          name: '',
          role: '',
          sourceUrl,
          discoveryMethod,
          confidenceScore: Math.min(95, baseConfidence + 15),
          verificationStatus: 'extracted',
          discoveredAt: new Date()
        });
      }
    }

    // 2. Regular text emails
    let textMatch;
    const emailRegex = new RegExp(EMAIL_REGEX);
    while ((textMatch = emailRegex.exec(html)) !== null) {
      const email = textMatch[0]?.toLowerCase().trim();
      if (this.isValidEmail(email) && !foundMap.has(email)) {
        // Compute confidence based on context
        let confidence = baseConfidence;
        if (sourceUrl.includes('contact') || sourceUrl.includes('about')) {
          confidence += 10;
        }
        if (sourceUrl.includes('write-for-us') || sourceUrl.includes('editorial')) {
          confidence += 10;
        }

        foundMap.set(email, {
          email,
          name: '',
          role: '',
          sourceUrl,
          discoveryMethod,
          confidenceScore: Math.min(90, Math.max(50, confidence)),
          verificationStatus: 'extracted',
          discoveredAt: new Date()
        });
      }
    }

    return Array.from(foundMap.values());
  }

  /**
   * Fetch a single URL safely with timeout and size cap
   */
  async fetchPage(url, timeoutMs = 5000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (Linkora/2.0 Outreach Crawler; contact@linkora.app)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        redirect: 'follow'
      });

      clearTimeout(timer);

      if (!res.ok) return null;

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
        return null;
      }

      // Read max 2MB
      const text = await res.text();
      return text.slice(0, 2 * 1024 * 1024);
    } catch {
      clearTimeout(timer);
      return null;
    }
  }

  /**
   * Crawl a prospect's website pages for contact information
   */
  async crawlWebsite(domain) {
    const cleanDomain = normalizeDomain(domain);
    if (!cleanDomain) return [];

    const discoveredEmails = new Map();

    for (const subpath of CONTACT_SUBPATHS) {
      const targetUrl = `https://${cleanDomain}${subpath}`;
      const html = await this.fetchPage(targetUrl, 5000);

      if (html) {
        const extracted = this.extractEmails(html, targetUrl, 'website_crawl', 80);
        for (const item of extracted) {
          if (!discoveredEmails.has(item.email)) {
            discoveredEmails.set(item.email, item);
          }
        }
      }

      // If we already found 3 or more high-confidence emails, we can safely conclude
      if (discoveredEmails.size >= 3) break;
    }

    return Array.from(discoveredEmails.values());
  }

  /**
   * Search engine fallback using Serper or Google if website crawl yielded no emails
   */
  async searchFallback(domain) {
    const cleanDomain = normalizeDomain(domain);
    if (!cleanDomain) return [];

    const status = searchDiscoveryProvider.getStatus();
    if (!status.configured) {
      return [];
    }

    try {
      const query = `"${cleanDomain}" (contact OR email OR "contact us" OR "reach us")`;
      let results = [];

      if (status.activeEngine === 'serper') {
        results = await searchDiscoveryProvider.searchSerper(query, 10);
      } else if (status.activeEngine === 'google') {
        results = await searchDiscoveryProvider.searchGoogle(query, 10);
      } else if (status.activeEngine === 'bing') {
        results = await searchDiscoveryProvider.searchBing(query, 10);
      }

      const foundEmails = new Map();

      for (const item of results) {
        const combinedText = `${item.title || ''} ${item.snippet || ''}`;
        const extracted = this.extractEmails(
          combinedText,
          item.url || `https://${cleanDomain}`,
          'search_fallback',
          70
        );

        for (const emailObj of extracted) {
          if (!foundEmails.has(emailObj.email)) {
            foundEmails.set(emailObj.email, emailObj);
          }
        }
      }

      return Array.from(foundEmails.values());
    } catch (err) {
      console.warn(`[ContactDiscovery] Search fallback error for ${cleanDomain}:`, err.message);
      return [];
    }
  }

  /**
   * Discover contacts for a single prospect document and persist results
   */
  async discoverContactForProspect(prospectDoc) {
    if (!prospectDoc) return { emails: [], status: 'not_found' };

    const domain = prospectDoc.prospectDomain || normalizeDomain(prospectDoc.prospectUrl);
    if (!domain) return { emails: [], status: 'not_found' };

    // If prospect already has manually verified contact emails, preserve them
    const existingEmails = Array.isArray(prospectDoc.contactEmails) ? [...prospectDoc.contactEmails] : [];
    const manualEmails = existingEmails.filter((e) => e.discoveryMethod === 'manual');

    // 1. Crawl website
    let discovered = await this.crawlWebsite(domain);

    // 2. Search fallback if crawling found nothing
    if (discovered.length === 0) {
      discovered = await this.searchFallback(domain);
    }

    // Merge manual and newly discovered emails
    const emailMap = new Map();

    // Preserve existing manual emails first (priority)
    for (const m of manualEmails) {
      emailMap.set(m.email, m);
    }

    // Add newly discovered emails
    for (const d of discovered) {
      if (!emailMap.has(d.email)) {
        emailMap.set(d.email, d);
      }
    }

    const mergedEmails = Array.from(emailMap.values());
    const bestEmail = mergedEmails.length > 0 ? mergedEmails[0].email : '';
    const newStatus = mergedEmails.length > 0 ? 'found' : 'not_found';

    // Update prospect document if connected
    if (mongoose.connection.readyState === 1) {
      prospectDoc.contactEmails = mergedEmails;
      prospectDoc.contactEmail = bestEmail;
      prospectDoc.contactStatus = newStatus;
      await prospectDoc.save();
    }

    return {
      domain,
      emails: mergedEmails,
      contactEmail: bestEmail,
      status: newStatus
    };
  }

  /**
   * Run contact discovery asynchronously for all prospects assigned to a campaign
   */
  async runCampaignContactDiscovery({ userId, websiteId, campaignId, forceRetry = false }) {
    const jobKey = `${campaignId}`;

    if (forceRetry) {
      this.activeJobs.delete(jobKey);
    } else if (this.activeJobs.has(jobKey)) {
      console.log(`[ContactDiscovery] Job for campaign ${campaignId} is already running.`);
      return { status: 'already_running', message: 'Contact discovery is currently in progress for this campaign.' };
    }

    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database connection is not open.');
    }

    const campaign = await Campaign.findOne({ _id: campaignId, userId, websiteId });
    if (!campaign) {
      throw new Error('Campaign not found or unauthorized.');
    }

    if (campaign.status === 'paused') {
      const err = new Error('Campaign is currently paused. Please resume the campaign to run contact discovery.');
      err.status = 400;
      throw err;
    }
    if (campaign.status === 'completed' || campaign.status === 'archived') {
      const err = new Error(`Cannot run contact discovery on a ${campaign.status} campaign.`);
      err.status = 400;
      throw err;
    }

    // Fetch all non-excluded assignments for this campaign
    const assignments = await CampaignProspectAssignment.find({
      campaignId,
      userId,
      websiteId,
      isExcluded: { $ne: true }
    }).populate('prospectId');

    const total = assignments.length;
    if (total === 0) {
      return {
        status: 'no_prospects',
        message: 'No prospects are currently assigned to this campaign. Please discover and assign prospects first.'
      };
    }

    // Synchronously initialize running progress on campaign before returning to caller
    campaign.discoverySummary = campaign.discoverySummary || {};
    campaign.discoverySummary.contactDiscoveryProgress = {
      total,
      processed: 0,
      status: 'running',
      error: '',
      startedAt: new Date(),
      completedAt: null
    };
    await campaign.save();

    this.activeJobs.add(jobKey);

    // Run crawler & fallback extraction in background without blocking caller
    (async () => {
      let processed = 0;
      let emailsFoundCount = 0;

      try {
        // Process in batches of 3 for concurrency without overwhelming network
        const batchSize = 3;
        for (let i = 0; i < assignments.length; i += batchSize) {
          if (mongoose.connection.readyState !== 1) break;

          const batch = assignments.slice(i, i + batchSize);

          await Promise.all(
            batch.map(async (assignment) => {
              try {
                if (assignment.prospectId && typeof assignment.prospectId === 'object') {
                  const prospect = assignment.prospectId;

                  // If prospect already has verified emails, count it without repeated crawling
                  if (prospect.contactEmail || (Array.isArray(prospect.contactEmails) && prospect.contactEmails.length > 0)) {
                    emailsFoundCount++;
                  } else {
                    // Update prospect status to searching
                    if (mongoose.connection.readyState === 1) {
                      await Prospect.updateOne({ _id: prospect._id }, { $set: { contactStatus: 'searching' } }).catch(() => {});
                    }

                    const result = await this.discoverContactForProspect(prospect);
                    if (result.emails && result.emails.length > 0) {
                      emailsFoundCount++;
                    }
                  }
                }
              } catch (err) {
                console.warn(`[ContactDiscovery] Error processing assignment ${assignment._id}:`, err.message);
              } finally {
                processed++;
              }
            })
          );

          // Update periodic progress
          if (mongoose.connection.readyState === 1) {
            await Campaign.updateOne(
              { _id: campaignId },
              {
                $set: {
                  'discoverySummary.contactDiscoveryProgress.processed': processed,
                  'discoverySummary.contactEmailsFoundCount': emailsFoundCount
                }
              }
            ).catch(() => {});
          }
        }

        // Mark completed
        if (mongoose.connection.readyState === 1) {
          await Campaign.updateOne(
            { _id: campaignId },
            {
              $set: {
                'discoverySummary.contactDiscoveryProgress.total': total,
                'discoverySummary.contactDiscoveryProgress.processed': processed,
                'discoverySummary.contactDiscoveryProgress.status': 'completed',
                'discoverySummary.contactDiscoveryProgress.completedAt': new Date(),
                'discoverySummary.contactEmailsFoundCount': emailsFoundCount
              }
            }
          ).catch(() => {});
        }
      } catch (err) {
        console.error(`[ContactDiscovery] Fatal error in campaign ${campaignId} job:`, err);
        if (mongoose.connection.readyState === 1) {
          await Campaign.updateOne(
            { _id: campaignId },
            {
              $set: {
                'discoverySummary.contactDiscoveryProgress.status': 'failed',
                'discoverySummary.contactDiscoveryProgress.error': err.message || 'Contact discovery failed'
              }
            }
          ).catch(() => {});
        }
      } finally {
        this.activeJobs.delete(jobKey);
      }
    })();

    return {
      status: 'started',
      total,
      message: `Contact discovery initiated for ${total} prospects.`
    };
  }
}

export const contactDiscoveryService = new ContactDiscoveryService();
export default contactDiscoveryService;
