import React from 'react';
import {
  Printer,
  Download,
  X,
  FileText,
  Globe,
  Calendar,
  CheckCircle2,
  Award,
  Link2,
  Rocket,
  Target,
  Send
} from 'lucide-react';
import { formatNumber } from '../../utils/formatters';
import { downloadAnalyticsCsv, printExecutiveReport } from '../../utils/exportAnalytics';

export const ExecutiveReportModal = ({ isOpen, onClose, reportData }) => {
  if (!isOpen || !reportData) return null;

  const { meta, executiveSummary, kpis, backlinks, campaigns, prospecting, outreach, recommendations } = reportData;

  const handlePrint = () => {
    printExecutiveReport();
  };

  const handleCsvDownload = () => {
    downloadAnalyticsCsv(reportData);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white print:static">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden print:border-none print:shadow-none print:max-w-none print:bg-white print:text-black">
        {/* Modal Top Actions (Hidden in Print) */}
        <div className="print:hidden bg-slate-950/80 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">Executive SEO Performance Report</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCsvDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Download CSV
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md transition"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save as PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Report Content Body */}
        <div className="p-8 space-y-8 print:p-6 print:space-y-6 text-slate-200 print:text-slate-900 bg-slate-900 print:bg-white">
          {/* Header */}
          <div className="border-b border-slate-800 print:border-slate-300 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold text-indigo-400 print:text-indigo-600 uppercase tracking-widest mb-1">
                LINKORA Executive SEO Brief
              </div>
              <h1 className="text-2xl font-black text-white print:text-black tracking-tight">
                {meta?.websiteName || 'Website Performance Audit'}
              </h1>
              <div className="flex items-center gap-3 text-xs text-slate-400 print:text-slate-600 mt-1">
                <span className="flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" /> {meta?.domain}
                </span>
                <span>•</span>
                <span>{meta?.url}</span>
              </div>
            </div>

            <div className="text-right text-xs text-slate-400 print:text-slate-600">
              <div className="flex items-center sm:justify-end gap-1.5 mb-1">
                <Calendar className="w-3.5 h-3.5" />
                <span className="font-semibold text-white print:text-black">
                  Period: {meta?.reportingPeriod}
                </span>
              </div>
              <div>{meta?.periodDates}</div>
              <div className="text-[10px] text-slate-500 print:text-slate-400 mt-1">
                Generated: {new Date(meta?.generatedAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Executive Summary Top Metrics Grid */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 print:text-slate-600 uppercase tracking-wider mb-3">
              1. Executive Overview & Authority Baseline
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-800/60 print:bg-slate-100 p-4 rounded-xl border border-slate-800 print:border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-500">
                  Total Backlinks
                </div>
                <div className="text-xl font-black text-white print:text-black mt-1">
                  {formatNumber(executiveSummary?.totalBacklinks)}
                </div>
                <div className="text-[10px] text-slate-500 print:text-slate-400">Moz Global Index</div>
              </div>

              <div className="bg-slate-800/60 print:bg-slate-100 p-4 rounded-xl border border-slate-800 print:border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-500">
                  Referring Domains
                </div>
                <div className="text-xl font-black text-white print:text-black mt-1">
                  {formatNumber(executiveSummary?.referringDomains)}
                </div>
                <div className="text-[10px] text-slate-500 print:text-slate-400">Unique Root Domains</div>
              </div>

              <div className="bg-slate-800/60 print:bg-slate-100 p-4 rounded-xl border border-slate-800 print:border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-500">
                  Moz Domain Authority
                </div>
                <div className="text-xl font-black text-emerald-400 print:text-emerald-700 mt-1">
                  {executiveSummary?.domainAuthority ?? 'N/A'}
                </div>
                <div className="text-[10px] text-slate-500 print:text-slate-400">Score (0-100)</div>
              </div>

              <div className="bg-slate-800/60 print:bg-slate-100 p-4 rounded-xl border border-slate-800 print:border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-500">
                  Period Net Growth
                </div>
                <div
                  className={`text-xl font-black mt-1 ${
                    executiveSummary?.netGrowth >= 0
                      ? 'text-emerald-400 print:text-emerald-700'
                      : 'text-rose-400 print:text-rose-700'
                  }`}
                >
                  {executiveSummary?.netGrowth >= 0
                    ? `+${executiveSummary?.netGrowth}`
                    : executiveSummary?.netGrowth}
                </div>
                <div className="text-[10px] text-slate-500 print:text-slate-400">New minus lost links</div>
              </div>
            </div>
          </div>

          {/* Full KPI Comparison Table */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 print:text-slate-600 uppercase tracking-wider mb-3">
              2. Key Metric Comparisons
            </h3>
            <div className="border border-slate-800 print:border-slate-300 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/80 print:bg-slate-200 text-slate-400 print:text-slate-700 uppercase text-[10px] font-semibold">
                  <tr>
                    <th className="py-2 px-3">Metric</th>
                    <th className="py-2 px-3">Current</th>
                    <th className="py-2 px-3">Previous</th>
                    <th className="py-2 px-3">Shift</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-slate-200">
                  {kpis &&
                    Object.entries(kpis).map(([key, val]) => (
                      <tr key={key}>
                        <td className="py-2 px-3 font-medium capitalize">
                          {key.replace(/([A-Z])/g, ' $1')}
                        </td>
                        <td className="py-2 px-3 font-bold font-mono">
                          {val.current !== null && val.current !== undefined
                            ? formatNumber(val.current)
                            : 'N/A'}
                        </td>
                        <td className="py-2 px-3 text-slate-400 print:text-slate-600 font-mono">
                          {val.previous !== null && val.previous !== undefined
                            ? formatNumber(val.previous)
                            : 'N/A'}
                        </td>
                        <td className="py-2 px-3 font-mono">
                          {val.percentChange !== null
                            ? `${val.percentChange > 0 ? '+' : ''}${val.percentChange}%`
                            : val.absoluteChange !== null
                            ? `${val.absoluteChange > 0 ? '+' : ''}${val.absoluteChange}`
                            : '—'}
                        </td>
                        <td className="py-2 px-3 text-[11px] text-slate-400 print:text-slate-600">
                          {val.hasComparison ? (val.isPositive ? 'Improved' : 'Decreased') : 'Baseline'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Anchor Texts */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 print:text-slate-600 uppercase tracking-wider mb-3">
              3. Anchor Text Distribution
            </h3>
            {backlinks?.topAnchors?.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {backlinks.topAnchors.map((a, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-slate-800/40 print:bg-slate-100 border border-slate-800 print:border-slate-200 flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-white print:text-black truncate max-w-[240px]">
                      "{a.anchorText}"
                    </span>
                    <span className="font-mono text-slate-400 print:text-slate-600">
                      {a.count} links ({a.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500">No anchor text records indexed</div>
            )}
          </div>

          {/* Strategic SEO Recommendations */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 print:text-slate-600 uppercase tracking-wider mb-3">
              4. Actionable SEO Recommendations
            </h3>
            <div className="space-y-2.5">
              {recommendations?.map((r, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-slate-800/40 print:bg-slate-100 border border-slate-800 print:border-slate-200 text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white print:text-black">{r.title}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-700 print:bg-slate-200 text-slate-300 print:text-slate-800">
                      {r.priority}
                    </span>
                  </div>
                  <div className="text-slate-300 print:text-slate-700 mb-1">{r.observation}</div>
                  <div className="text-emerald-400 print:text-emerald-700 font-medium">
                    → Next Step: {r.suggestedNextStep}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
