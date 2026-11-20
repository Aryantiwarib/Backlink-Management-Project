// Centralized Mock Data for Linkora Dashboard Overview

export const mockWebsites = [
  { id: 'growthlabs.io', name: 'growthlabs.io', label: 'GrowthLabs SaaS', icon: 'Globe', plan: 'Enterprise Pro' },
  { id: 'saasmetrics.co', name: 'saasmetrics.co', label: 'SaaS Metrics Hub', icon: 'BarChart3', plan: 'Growth Tier' },
  { id: 'fintechpulse.com', name: 'fintechpulse.com', label: 'FinTech Pulse', icon: 'Layers', plan: 'Standard' }
];

export const mockDashboardData = {
  'growthlabs.io': {
    '30d': {
      totalBacklinks: 24856,
      referringDomains: 8492,
      newBacklinks: 1284,
      lostBacklinks: 186,
      metrics: {
        totalBacklinksChange: 12.8,
        referringDomainsChange: 6.4,
        newBacklinksChange: 18.2,
        lostBacklinksChange: -4.6
      },
      sparklines: {
        totalBacklinks: [21500, 22100, 22800, 23400, 24100, 24500, 24856],
        referringDomains: [7900, 8050, 8180, 8290, 8360, 8420, 8492],
        newBacklinks: [950, 1020, 1110, 1080, 1190, 1240, 1284],
        lostBacklinks: [230, 215, 205, 198, 192, 190, 186]
      },
      linkAttributes: [
        { name: 'Dofollow', value: 68, count: 16902, color: '#10B981' },
        { name: 'Nofollow', value: 24, count: 5965, color: '#3B82F6' },
        { name: 'Sponsored', value: 5, count: 1243, color: '#F59E0B' },
        { name: 'UGC', value: 3, count: 746, color: '#8B5CF6' }
      ]
    },
    '7d': {
      totalBacklinks: 24856,
      referringDomains: 8492,
      newBacklinks: 342,
      lostBacklinks: 41,
      metrics: {
        totalBacklinksChange: 4.2,
        referringDomainsChange: 2.1,
        newBacklinksChange: 8.5,
        lostBacklinksChange: -1.8
      },
      sparklines: {
        totalBacklinks: [24100, 24250, 24400, 24550, 24680, 24780, 24856],
        referringDomains: [8380, 8400, 8420, 8440, 8460, 8475, 8492],
        newBacklinks: [42, 51, 38, 62, 49, 53, 47],
        lostBacklinks: [7, 6, 8, 5, 4, 6, 5]
      },
      linkAttributes: [
        { name: 'Dofollow', value: 69, count: 17150, color: '#10B981' },
        { name: 'Nofollow', value: 23, count: 5717, color: '#3B82F6' },
        { name: 'Sponsored', value: 5, count: 1243, color: '#F59E0B' },
        { name: 'UGC', value: 3, count: 746, color: '#8B5CF6' }
      ]
    },
    '90d': {
      totalBacklinks: 24856,
      referringDomains: 8492,
      newBacklinks: 4120,
      lostBacklinks: 590,
      metrics: {
        totalBacklinksChange: 28.4,
        referringDomainsChange: 19.1,
        newBacklinksChange: 34.6,
        lostBacklinksChange: -8.2
      },
      sparklines: {
        totalBacklinks: [18400, 19800, 21200, 22500, 23600, 24200, 24856],
        referringDomains: [6900, 7250, 7600, 7950, 8200, 8350, 8492],
        newBacklinks: [1100, 1250, 1340, 1420, 1380, 1490, 1550],
        lostBacklinks: [280, 250, 230, 210, 195, 190, 186]
      },
      linkAttributes: [
        { name: 'Dofollow', value: 67, count: 16653, color: '#10B981' },
        { name: 'Nofollow', value: 25, count: 6214, color: '#3B82F6' },
        { name: 'Sponsored', value: 5, count: 1243, color: '#F59E0B' },
        { name: 'UGC', value: 3, count: 746, color: '#8B5CF6' }
      ]
    },
    'this_month': {
      totalBacklinks: 24856,
      referringDomains: 8492,
      newBacklinks: 1284,
      lostBacklinks: 186,
      metrics: {
        totalBacklinksChange: 12.8,
        referringDomainsChange: 6.4,
        newBacklinksChange: 18.2,
        lostBacklinksChange: -4.6
      },
      sparklines: {
        totalBacklinks: [21500, 22100, 22800, 23400, 24100, 24500, 24856],
        referringDomains: [7900, 8050, 8180, 8290, 8360, 8420, 8492],
        newBacklinks: [950, 1020, 1110, 1080, 1190, 1240, 1284],
        lostBacklinks: [230, 215, 205, 198, 192, 190, 186]
      },
      linkAttributes: [
        { name: 'Dofollow', value: 68, count: 16902, color: '#10B981' },
        { name: 'Nofollow', value: 24, count: 5965, color: '#3B82F6' },
        { name: 'Sponsored', value: 5, count: 1243, color: '#F59E0B' },
        { name: 'UGC', value: 3, count: 746, color: '#8B5CF6' }
      ]
    }
  },
  'saasmetrics.co': {
    '30d': {
      totalBacklinks: 14210,
      referringDomains: 4830,
      newBacklinks: 812,
      lostBacklinks: 94,
      metrics: {
        totalBacklinksChange: 9.4,
        referringDomainsChange: 5.1,
        newBacklinksChange: 14.0,
        lostBacklinksChange: -2.1
      },
      sparklines: {
        totalBacklinks: [12900, 13150, 13400, 13700, 13950, 14100, 14210],
        referringDomains: [4500, 4580, 4650, 4710, 4770, 4800, 4830],
        newBacklinks: [610, 680, 720, 750, 780, 800, 812],
        lostBacklinks: [110, 105, 102, 99, 97, 95, 94]
      },
      linkAttributes: [
        { name: 'Dofollow', value: 72, count: 10231, color: '#10B981' },
        { name: 'Nofollow', value: 20, count: 2842, color: '#3B82F6' },
        { name: 'Sponsored', value: 6, count: 853, color: '#F59E0B' },
        { name: 'UGC', value: 2, count: 284, color: '#8B5CF6' }
      ]
    }
  },
  'fintechpulse.com': {
    '30d': {
      totalBacklinks: 38940,
      referringDomains: 12150,
      newBacklinks: 2190,
      lostBacklinks: 310,
      metrics: {
        totalBacklinksChange: 16.2,
        referringDomainsChange: 8.9,
        newBacklinksChange: 22.4,
        lostBacklinksChange: -6.1
      },
      sparklines: {
        totalBacklinks: [33200, 34500, 35600, 36800, 37500, 38200, 38940],
        referringDomains: [11100, 11350, 11580, 11790, 11950, 12050, 12150],
        newBacklinks: [1600, 1750, 1850, 1980, 2050, 2120, 2190],
        lostBacklinks: [360, 345, 335, 325, 320, 315, 310]
      },
      linkAttributes: [
        { name: 'Dofollow', value: 64, count: 24921, color: '#10B981' },
        { name: 'Nofollow', value: 27, count: 10514, color: '#3B82F6' },
        { name: 'Sponsored', value: 6, count: 2336, color: '#F59E0B' },
        { name: 'UGC', value: 3, count: 1168, color: '#8B5CF6' }
      ]
    }
  }
};
