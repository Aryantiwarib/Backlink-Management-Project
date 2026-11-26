/**
 * Export Analytics & Reports Utility
 * Generates formatted CSVs and handles printable executive reports
 */

export const downloadAnalyticsCsv = (reportData, filename) => {
  try {
    if (!reportData) return;

    const domain = reportData.meta?.domain || 'linkora';
    const range = reportData.meta?.reportingPeriod || 'period';
    const dateStr = new Date().toISOString().split('T')[0];
    const name = filename || `linkora-report-${domain}-${range}-${dateStr}.csv`;

    let csv = '\uFEFF'; // BOM
    csv += '=== LINKORA EXECUTIVE SEO & BACKLINK PERFORMANCE REPORT ===\r\n';
    csv += `Website Name,${reportData.meta?.websiteName || domain}\r\n`;
    csv += `Domain,${domain}\r\n`;
    csv += `Reporting Period,${range} (${reportData.meta?.periodDates || ''})\r\n`;
    csv += `Generated At,${new Date().toLocaleString()}\r\n\r\n`;

    // 1. KPIs
    csv += '--- KEY PERFORMANCE METRICS ---\r\n';
    csv += 'Metric,Current Value,Previous Period,Change,Trend\r\n';
    const k = reportData.kpis || {};
    const formatRow = (label, obj, isPct = false) => {
      const curr = obj?.current ?? 'N/A';
      const prev = obj?.previous ?? 'N/A';
      let chg = 'N/A';
      if (obj?.percentChange !== null && obj?.percentChange !== undefined) {
        chg = `${obj.percentChange > 0 ? '+' : ''}${obj.percentChange}%`;
      } else if (obj?.absoluteChange !== null && obj?.absoluteChange !== undefined) {
        chg = `${obj.absoluteChange > 0 ? '+' : ''}${obj.absoluteChange}`;
      }
      const trend = obj?.hasComparison ? (obj?.isPositive ? 'Up' : 'Down') : 'No baseline';
      return `"${label}",${curr},${prev},${chg},${trend}\r\n`;
    };

    csv += formatRow('Total Backlinks', k.totalBacklinks);
    csv += formatRow('Referring Domains', k.referringDomains);
    csv += formatRow('Moz Domain Authority (DA)', k.domainAuthority);
    csv += formatRow('Moz Page Authority (PA)', k.pageAuthority);
    csv += formatRow('New Backlinks (Period)', k.newBacklinks);
    csv += formatRow('Lost Backlinks (Period)', k.lostBacklinks);
    csv += formatRow('Active Campaigns', k.activeCampaigns);
    csv += formatRow('Qualified Prospects', k.qualifiedProspects);
    csv += '\r\n';

    // 2. Top Anchor Texts
    csv += '--- TOP ANCHOR TEXTS ---\r\n';
    csv += 'Anchor Text,Occurrences,Percentage of Indexed Links\r\n';
    const anchors = reportData.backlinks?.topAnchors || [];
    if (anchors.length > 0) {
      anchors.forEach((a) => {
        csv += `"${(a.anchorText || '').replace(/"/g, '""')}",${a.count},${a.percentage}%\r\n`;
      });
    } else {
      csv += 'No anchor texts recorded,0,0%\r\n';
    }
    csv += '\r\n';

    // 3. Campaign Performance
    csv += '--- TOP CAMPAIGNS ---\r\n';
    csv += 'Campaign Name,Type,Status,Target Links,Acquired Links,Progress,Assigned Prospects\r\n';
    const camps = reportData.campaigns?.topPerforming || [];
    if (camps.length > 0) {
      camps.forEach((c) => {
        csv += `"${(c.name || '').replace(/"/g, '""')}",${c.campaignType},${c.status},${c.targetBacklinks},${c.acquiredBacklinks},${c.progressPercentage}%,${c.assignedProspects}\r\n`;
      });
    } else {
      csv += 'No campaigns recorded,N/A,N/A,0,0,0%,0\r\n';
    }
    csv += '\r\n';

    // 4. Strategic Recommendations
    csv += '--- STRATEGIC SEO RECOMMENDATIONS ---\r\n';
    csv += 'Priority,Category,Finding,Action\r\n';
    const recs = reportData.recommendations || [];
    if (recs.length > 0) {
      recs.forEach((r) => {
        csv += `"${r.priority || 'medium'}","${r.title || ''}","${(r.observation || '').replace(/"/g, '""')}","${(r.suggestedNextStep || '').replace(/"/g, '""')}"\r\n`;
      });
    }

    // Trigger download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', name);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { success: true, filename: name };
  } catch (err) {
    console.error('Failed to export CSV:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Trigger clean browser print dialog with print-specific layout styles
 */
export const printExecutiveReport = () => {
  window.print();
};
