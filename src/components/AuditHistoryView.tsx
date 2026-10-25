import React, { useState } from 'react';
import { History, Search, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { AuditRun, Campaign, Brand } from '../types';
import { NavPage } from './Navigation';

interface AuditHistoryViewProps {
  audits: AuditRun[];
  campaigns: Campaign[];
  brand: Brand | null;
  onSelectAudit: (audit: AuditRun) => void;
  setActivePage: (page: NavPage) => void;
}

export const AuditHistoryView: React.FC<AuditHistoryViewProps> = ({
  audits,
  campaigns,
  brand,
  onSelectAudit,
  setActivePage,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!brand) {
    return (
      <div className="p-8 text-center text-xs text-stone-500">
        Select a brand to view audit history.
      </div>
    );
  }

  const brandAudits = audits.filter((a) => a.brandId === brand.id);

  const getCampaignName = (id: string) => {
    return campaigns.find((c) => c.id === id)?.name || id;
  };

  const filtered = brandAudits.filter((a) => {
    const cName = getCampaignName(a.campaignId).toLowerCase();
    return (
      cName.includes(searchTerm.toLowerCase()) ||
      a.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-1">
            Verification Records · {brand.name}
          </div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Audit History</h1>
          <p className="text-xs text-stone-500 mt-1 max-w-2xl">
            Complete traceability log of every compliance audit run, validated findings, and scoring output.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by campaign name or audit run ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
        </div>
        <div className="text-xs text-stone-400 font-mono tabular-nums">
          {filtered.length} Recorded Run{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Audits Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-xs text-stone-500">
            No audit records matching your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50/80 text-stone-500 uppercase tracking-wider text-[10px] font-semibold border-b border-stone-200">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Campaign</th>
                  <th className="px-6 py-3">Draft Ver</th>
                  <th className="px-6 py-3">Compliance Score</th>
                  <th className="px-6 py-3">Violations</th>
                  <th className="px-6 py-3">Release Decision</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((audit) => {
                  const score = audit.scoreCalculation.complianceScore;
                  return (
                    <tr key={audit.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="px-6 py-3.5 font-mono text-stone-600">
                        {new Date(audit.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 font-semibold text-stone-900">
                        {getCampaignName(audit.campaignId)}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-stone-600">
                        v{audit.draftVersion}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`font-mono font-bold tabular-nums ${
                            score === null
                              ? 'text-stone-400'
                              : score >= 90
                              ? 'text-emerald-700'
                              : score >= 70
                              ? 'text-amber-700'
                              : 'text-red-700'
                          }`}
                        >
                          {score !== null ? `${score}%` : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-stone-600 font-mono text-[11px]">
                        {audit.validatedFindings.length} found ({audit.scoreCalculation.criticalCount} crit)
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`font-medium capitalize text-[11px] ${
                            audit.releaseRecommendation.allowsRelease
                              ? 'text-emerald-700'
                              : 'text-red-700'
                          }`}
                        >
                          {audit.releaseRecommendation.recommendedStatus.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          onClick={() => {
                            onSelectAudit(audit);
                            setActivePage('audit-results');
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 rounded transition-colors"
                        >
                          Inspect Findings
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
