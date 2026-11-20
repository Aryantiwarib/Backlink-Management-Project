// Actionable Alerts Data for Linkora

export const mockAlerts = [
  {
    id: 'alert-001',
    title: '12 backlinks have been lost recently.',
    description: 'High-DR domains changed page structure or returned 404/301 status in the last 72 hours.',
    severity: 'warning', // 'warning' | 'error' | 'info'
    category: 'backlinks',
    actionLabel: 'Review Links',
    targetRoute: '/backlinks',
    details: [
      { domain: 'forbes.com/innovation-trends', dr: 92, lostDate: 'Nov 19', reason: 'Link removed from source text' },
      { domain: 'entrepreneur.com/saas-tools', dr: 87, lostDate: 'Nov 18', reason: '404 Page Not Found' },
      { domain: 'businessinsider.com/tech-stack', dr: 89, lostDate: 'Nov 17', reason: 'Redirected to canonical without link' }
    ]
  },
  {
    id: 'alert-002',
    title: '3 articles are waiting for review.',
    description: 'SEO content drafts have passed initial plagiarism and keyword checks and await editor approval.',
    severity: 'info',
    category: 'content',
    actionLabel: 'Review Content',
    targetRoute: '/content-planner',
    details: [
      { title: 'Top 15 SaaS SEO Growth Metrics to Track', author: 'David Chen', words: '2,450', submitted: '1 day ago' },
      { title: 'Semantic Keyword Clustering Blueprint', author: 'Alex Morgan', words: '3,100', submitted: '2 days ago' },
      { title: 'Programmatic SEO for B2B Directories', author: 'Elena Rostova', words: '1,890', submitted: '3 days ago' }
    ]
  },
  {
    id: 'alert-003',
    title: '2 publishing tasks failed.',
    description: 'Automated webhook to CMS (Webflow & WordPress) timed out during scheduled publishing.',
    severity: 'error',
    category: 'system',
    actionLabel: 'View Errors',
    targetRoute: '/settings',
    details: [
      { task: 'Webflow Sync: "AI Backlink Strategy"', error: 'ETIMEDOUT: API endpoint connection reset by peer', timestamp: 'Today at 04:15 AM' },
      { task: 'Ghost CMS Webhook: "SaaS Link Indexer"', error: 'HTTP 502: Bad Gateway from origin server', timestamp: 'Yesterday at 11:30 PM' }
    ]
  }
];
