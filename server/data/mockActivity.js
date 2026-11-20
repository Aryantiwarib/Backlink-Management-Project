// Centralized Mock Activity Data for Linkora

export let mockActivities = [
  {
    id: 'act-001',
    type: 'backlink_discovered',
    iconType: 'Link2',
    title: 'New high-authority backlink discovered',
    description: 'techcrunch.com linked to your homepage with DR 91 (Dofollow)',
    timestamp: '12 minutes ago',
    severity: 'success',
    link: '/backlinks'
  },
  {
    id: 'act-002',
    type: 'content_published',
    iconType: 'FileCheck',
    title: 'Article published live',
    description: '"Complete Guide to Backlink Audits in 2026" published on growthlabs.io/blog',
    timestamp: '45 minutes ago',
    severity: 'info',
    link: '/content-planner'
  },
  {
    id: 'act-003',
    type: 'backlink_lost',
    iconType: 'Link2Off',
    title: 'Backlink status changed: Lost',
    description: 'forbes.com/innovation-trends anchor link was removed or redirected (404)',
    timestamp: '3 hours ago',
    severity: 'warning',
    link: '/backlinks'
  },
  {
    id: 'act-004',
    type: 'verification_completed',
    iconType: 'CheckCircle2',
    title: 'Automated verification cycle completed',
    description: 'Indexed and verified 1,420 backlinks. 99.1% uptime rate confirmed.',
    timestamp: '6 hours ago',
    severity: 'success',
    link: '/backlinks'
  },
  {
    id: 'act-005',
    type: 'campaign_created',
    iconType: 'Rocket',
    title: 'Campaign created: Q4 SaaS Authority',
    description: 'Target: 50 guest posts, 25 broken links across SaaS and B2B directories',
    timestamp: 'Yesterday at 4:30 PM',
    severity: 'info',
    link: '/link-acquisition'
  },
  {
    id: 'act-006',
    type: 'review_required',
    iconType: 'AlertCircle',
    title: 'Content review required',
    description: '"10 Best Link Building Strategies for 2026" drafted by SEO team needs editorial signoff',
    timestamp: 'Yesterday at 11:15 AM',
    severity: 'warning',
    link: '/content-planner'
  }
];

export const addActivity = (activity) => {
  mockActivities = [activity, ...mockActivities];
  return mockActivities;
};
