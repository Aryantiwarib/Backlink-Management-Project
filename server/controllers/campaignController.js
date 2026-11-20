import { addActivity } from '../data/mockActivity.js';

let mockCampaigns = [
  {
    id: 'cmp-001',
    name: 'Q4 SaaS Authority',
    targetWebsite: 'growthlabs.io',
    campaignType: 'Guest Posting',
    status: 'In Progress',
    targetLinks: 50,
    acquiredLinks: 28,
    createdAt: '2026-11-19T10:00:00Z'
  },
  {
    id: 'cmp-002',
    name: 'Broken Link Reclamation - Tech Blogs',
    targetWebsite: 'growthlabs.io',
    campaignType: 'Broken Link',
    status: 'Active',
    targetLinks: 25,
    acquiredLinks: 14,
    createdAt: '2026-11-10T08:30:00Z'
  }
];

export const createCampaign = (req, res) => {
  try {
    const { name, targetWebsite, campaignType, targetLinks = 20, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Campaign name is required.'
      });
    }

    if (!targetWebsite) {
      return res.status(400).json({
        success: false,
        message: 'Target website is required.'
      });
    }

    if (!campaignType) {
      return res.status(400).json({
        success: false,
        message: 'Campaign type is required.'
      });
    }

    const newCampaign = {
      id: `cmp-${Date.now()}`,
      name: name.trim(),
      targetWebsite,
      campaignType,
      targetLinks: Number(targetLinks) || 20,
      acquiredLinks: 0,
      notes: notes || '',
      status: 'Active',
      createdAt: new Date().toISOString()
    };

    mockCampaigns.unshift(newCampaign);

    // Also register an activity event in the timeline
    addActivity({
      id: `act-${Date.now()}`,
      type: 'campaign_created',
      iconType: 'Rocket',
      title: `Campaign created: ${newCampaign.name}`,
      description: `Targeting ${newCampaign.targetWebsite} with ${newCampaign.campaignType} strategy (${newCampaign.targetLinks} links goal)`,
      timestamp: 'Just now',
      severity: 'info',
      link: '/link-acquisition'
    });

    return res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      data: newCampaign
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create campaign',
      error: error.message
    });
  }
};

export const getCampaigns = (req, res) => {
  return res.status(200).json({
    success: true,
    data: mockCampaigns
  });
};
