import mongoose from 'mongoose';
import Prospect, { normalizeDomain } from '../../models/Prospect.js';
import { calculateOpportunityScore } from './opportunityScorer.js';

// Regex escape helper for safe searches
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

const ALLOWED_SORT_FIELDS = [
  'createdAt',
  'opportunityScore',
  'domainAuthority',
  'prospectDomain',
  'status',
  'updatedAt'
];

export class ProspectService {
  /**
   * Save or upsert a single prospect record.
   * Preserves user-assigned status, notes, and tags if record already exists.
   */
  async saveProspect({ userId, websiteId, prospectData }) {
    if (!userId || !websiteId || !prospectData) {
      throw new Error('userId, websiteId, and prospectData are required.');
    }

    const domain = normalizeDomain(prospectData.prospectDomain || prospectData.prospectUrl);
    if (!domain) {
      throw new Error('A valid prospect domain or URL is required.');
    }

    const url = prospectData.prospectUrl || `https://${domain}`;

    // Calculate score if not provided
    let opportunityScore = prospectData.opportunityScore;
    let opportunityFactors = prospectData.opportunityFactors;
    if (opportunityScore === undefined || opportunityScore === null) {
      const scoring = calculateOpportunityScore({
        domainAuthority: prospectData.domainAuthority,
        spamScore: prospectData.spamScore,
        competitorOverlap: prospectData.competitorDomains?.length || 1,
        source: prospectData.source || 'competitor',
        linkType: prospectData.linkType || 'unknown'
      });
      opportunityScore = scoring.score;
      opportunityFactors = scoring.factors;
    }

    // Check if prospect already exists for this website & user
    const existing = await Prospect.findOne({ userId, websiteId, prospectDomain: domain });

    if (existing) {
      // Preserve existing notes, status, and tags if they were previously set
      if (prospectData.domainAuthority !== undefined && prospectData.domainAuthority !== null) {
        existing.domainAuthority = prospectData.domainAuthority;
      }
      if (prospectData.pageAuthority !== undefined && prospectData.pageAuthority !== null) {
        existing.pageAuthority = prospectData.pageAuthority;
      }
      if (prospectData.spamScore !== undefined && prospectData.spamScore !== null) {
        existing.spamScore = prospectData.spamScore;
      }
      if (opportunityScore !== undefined && opportunityScore !== null) {
        existing.opportunityScore = opportunityScore;
        existing.opportunityFactors = opportunityFactors || [];
      }
      if (prospectData.competitorDomains && Array.isArray(prospectData.competitorDomains)) {
        const set = new Set([...existing.competitorDomains, ...prospectData.competitorDomains]);
        existing.competitorDomains = Array.from(set);
      }
      // If caller explicitly provided notes or status on update
      if (prospectData.notes !== undefined) existing.notes = prospectData.notes;
      if (prospectData.status !== undefined) existing.status = prospectData.status;
      if (prospectData.tags !== undefined) existing.tags = prospectData.tags;
      if (prospectData.contactEmail !== undefined) existing.contactEmail = prospectData.contactEmail;

      await existing.save();
      return {
        prospect: existing.toSafeObject(),
        isNew: false
      };
    }

    // Create new prospect
    const newProspect = await Prospect.create({
      userId,
      websiteId,
      prospectDomain: domain,
      prospectUrl: url,
      source: prospectData.source || 'competitor',
      discoveredFrom: prospectData.discoveredFrom || '',
      discoveryKeyword: prospectData.discoveryKeyword || '',
      competitorDomains: prospectData.competitorDomains || [],
      domainAuthority: prospectData.domainAuthority ?? null,
      pageAuthority: prospectData.pageAuthority ?? null,
      spamScore: prospectData.spamScore ?? null,
      relevanceCategory: prospectData.relevanceCategory || '',
      opportunityScore,
      opportunityFactors: opportunityFactors || [],
      status: prospectData.status || 'saved',
      notes: prospectData.notes || '',
      tags: prospectData.tags || [],
      contactEmail: prospectData.contactEmail || '',
      metrics: prospectData.metrics || {}
    });

    return {
      prospect: newProspect.toSafeObject(),
      isNew: true
    };
  }

  /**
   * Bulk save multiple candidate prospects
   */
  async bulkSave({ userId, websiteId, prospectsList = [] }) {
    if (!userId || !websiteId) {
      throw new Error('userId and websiteId are required.');
    }

    let savedCount = 0;
    let existingCount = 0;
    const results = [];

    for (const item of prospectsList) {
      try {
        const { prospect, isNew } = await this.saveProspect({
          userId,
          websiteId,
          prospectData: item
        });
        if (isNew) savedCount++;
        else existingCount++;
        results.push(prospect);
      } catch (err) {
        console.warn('[ProspectService] Bulk save item error:', err.message);
      }
    }

    return {
      success: true,
      totalProcessed: prospectsList.length,
      savedCount,
      existingCount,
      prospects: results
    };
  }

  /**
   * Retrieve saved prospects with database filtering, search, sorting and pagination
   */
  async getSavedProspects({
    userId,
    websiteId,
    page = 1,
    limit = 10,
    search,
    status,
    source,
    minDA,
    maxDA,
    minScore,
    maxScore,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 10), 100);
    const skip = (pageNum - 1) * limitNum;

    const query = {
      userId,
      websiteId
    };

    // Text search on prospectDomain, prospectUrl, notes, discoveryKeyword
    if (search && typeof search === 'string' && search.trim()) {
      const escaped = escapeRegex(search.trim());
      const regex = new RegExp(escaped, 'i');
      query.$or = [
        { prospectDomain: regex },
        { prospectUrl: regex },
        { discoveryKeyword: regex },
        { discoveredFrom: regex },
        { notes: regex }
      ];
    }

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Source filter
    if (source && source !== 'all') {
      query.source = source;
    }

    // Domain Authority range filter
    if (minDA !== undefined && minDA !== '' && minDA !== null) {
      query.domainAuthority = { ...query.domainAuthority, $gte: Number(minDA) };
    }
    if (maxDA !== undefined && maxDA !== '' && maxDA !== null) {
      query.domainAuthority = { ...query.domainAuthority, $lte: Number(maxDA) };
    }

    // Opportunity score range filter
    if (minScore !== undefined && minScore !== '' && minScore !== null) {
      query.opportunityScore = { ...query.opportunityScore, $gte: Number(minScore) };
    }
    if (maxScore !== undefined && maxScore !== '' && maxScore !== null) {
      query.opportunityScore = { ...query.opportunityScore, $lte: Number(maxScore) };
    }

    // Sorting
    const sortField = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortDirection };

    const [total, prospects] = await Promise.all([
      Prospect.countDocuments(query),
      Prospect.find(query).sort(sort).skip(skip).limit(limitNum)
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      prospects: prospects.map((p) => p.toSafeObject()),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    };
  }

  /**
   * Get single prospect by ID
   */
  async getProspectById({ userId, websiteId, prospectId }) {
    if (!mongoose.Types.ObjectId.isValid(prospectId)) {
      const err = new Error('Invalid prospect ID format.');
      err.status = 400;
      throw err;
    }

    const prospect = await Prospect.findOne({ _id: prospectId, userId, websiteId });
    if (!prospect) {
      const err = new Error('Prospect not found or unauthorized.');
      err.status = 404;
      throw err;
    }

    return prospect.toSafeObject();
  }

  /**
   * Update prospect status, notes, tags, contact email
   */
  async updateProspect({ userId, websiteId, prospectId, status, notes, tags, contactEmail }) {
    if (!mongoose.Types.ObjectId.isValid(prospectId)) {
      const err = new Error('Invalid prospect ID format.');
      err.status = 400;
      throw err;
    }

    const update = {};
    if (status && ['new', 'saved', 'reviewed', 'qualified', 'rejected'].includes(status)) {
      update.status = status;
    }
    if (notes !== undefined) update.notes = String(notes).trim().slice(0, 2000);
    if (Array.isArray(tags)) update.tags = tags.map((t) => String(t).trim()).filter(Boolean);
    if (contactEmail !== undefined) update.contactEmail = String(contactEmail).trim();

    const prospect = await Prospect.findOneAndUpdate(
      { _id: prospectId, userId, websiteId },
      { $set: update },
      { returnDocument: 'after' }
    );

    if (!prospect) {
      const err = new Error('Prospect not found or unauthorized.');
      err.status = 404;
      throw err;
    }

    return prospect.toSafeObject();
  }

  /**
   * Delete a single prospect
   */
  async deleteProspect({ userId, websiteId, prospectId }) {
    if (!mongoose.Types.ObjectId.isValid(prospectId)) {
      const err = new Error('Invalid prospect ID format.');
      err.status = 400;
      throw err;
    }

    const deleted = await Prospect.findOneAndDelete({ _id: prospectId, userId, websiteId });
    if (!deleted) {
      const err = new Error('Prospect not found or unauthorized.');
      err.status = 404;
      throw err;
    }

    return {
      success: true,
      message: 'Prospect deleted successfully.',
      id: prospectId
    };
  }

  /**
   * Bulk update status for multiple prospects
   */
  async bulkUpdateStatus({ userId, websiteId, prospectIds = [], status }) {
    if (!status || !['new', 'saved', 'reviewed', 'qualified', 'rejected'].includes(status)) {
      throw new Error('Valid status is required for bulk update.');
    }

    if (!Array.isArray(prospectIds) || prospectIds.length === 0) {
      throw new Error('prospectIds array is required.');
    }

    const validIds = prospectIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

    const result = await Prospect.updateMany(
      { _id: { $in: validIds }, userId, websiteId },
      { $set: { status } }
    );

    return {
      success: true,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    };
  }

  /**
   * Bulk delete multiple prospects
   */
  async bulkDelete({ userId, websiteId, prospectIds = [] }) {
    if (!Array.isArray(prospectIds) || prospectIds.length === 0) {
      throw new Error('prospectIds array is required.');
    }

    const validIds = prospectIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

    const result = await Prospect.deleteMany({
      _id: { $in: validIds },
      userId,
      websiteId
    });

    return {
      success: true,
      deletedCount: result.deletedCount
    };
  }

  /**
   * Summary stats for Prospecting dashboard
   */
  async getStats({ userId, websiteId }) {
    const [
      totalSaved,
      statusCounts,
      sourceCounts,
      avgDaResult,
      avgScoreResult
    ] = await Promise.all([
      Prospect.countDocuments({ userId, websiteId }),
      Prospect.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), websiteId: new mongoose.Types.ObjectId(websiteId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Prospect.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), websiteId: new mongoose.Types.ObjectId(websiteId) } },
        { $group: { _id: '$source', count: { $sum: 1 } } }
      ]),
      Prospect.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            websiteId: new mongoose.Types.ObjectId(websiteId),
            domainAuthority: { $ne: null }
          }
        },
        { $group: { _id: null, avgDA: { $avg: '$domainAuthority' } } }
      ]),
      Prospect.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            websiteId: new mongoose.Types.ObjectId(websiteId),
            opportunityScore: { $ne: null }
          }
        },
        { $group: { _id: null, avgScore: { $avg: '$opportunityScore' } } }
      ])
    ]);

    const byStatus = {
      new: 0,
      saved: 0,
      reviewed: 0,
      qualified: 0,
      rejected: 0
    };
    for (const sc of statusCounts) {
      if (sc._id) byStatus[sc._id] = sc.count;
    }

    const bySource = {
      competitor: 0,
      keyword: 0,
      directory: 0,
      manual: 0
    };
    for (const so of sourceCounts) {
      if (so._id) bySource[so._id] = so.count;
    }

    const avgDA = avgDaResult.length > 0 ? Math.round(avgDaResult[0].avgDA) : null;
    const avgScore = avgScoreResult.length > 0 ? Math.round(avgScoreResult[0].avgScore) : null;

    return {
      totalSaved,
      byStatus,
      bySource,
      avgDA,
      avgScore
    };
  }

  /**
   * Export prospects as CSV format
   */
  async exportCsv({ userId, websiteId, search, status, source }) {
    const query = { userId, websiteId };
    if (search && typeof search === 'string' && search.trim()) {
      const escaped = escapeRegex(search.trim());
      const regex = new RegExp(escaped, 'i');
      query.$or = [{ prospectDomain: regex }, { prospectUrl: regex }, { notes: regex }];
    }
    if (status && status !== 'all') query.status = status;
    if (source && source !== 'all') query.source = source;

    const prospects = await Prospect.find(query).sort({ opportunityScore: -1, createdAt: -1 }).limit(1000);

    const headers = [
      'Domain',
      'URL',
      'Opportunity Score',
      'Domain Authority',
      'Page Authority',
      'Spam Score',
      'Status',
      'Source',
      'Discovered From',
      'Competitor Overlap',
      'Contact Email',
      'Notes',
      'Date Saved'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = prospects.map((p) => [
      escapeCsv(p.prospectDomain),
      escapeCsv(p.prospectUrl),
      p.opportunityScore !== null ? p.opportunityScore : '',
      p.domainAuthority !== null ? p.domainAuthority : '',
      p.pageAuthority !== null ? p.pageAuthority : '',
      p.spamScore !== null ? p.spamScore : '',
      escapeCsv(p.status),
      escapeCsv(p.source),
      escapeCsv(p.discoveredFrom),
      escapeCsv(p.competitorDomains?.join(', ') || ''),
      escapeCsv(p.contactEmail),
      escapeCsv(p.notes),
      escapeCsv(new Date(p.createdAt).toISOString().split('T')[0])
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

export const prospectService = new ProspectService();
export default prospectService;
