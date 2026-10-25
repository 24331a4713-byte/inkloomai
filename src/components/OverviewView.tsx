import React from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ArrowRight,
  Sparkles,
  BookOpen,
  Plus,
  Play,
  Upload,
  Clock,
  Check,
} from 'lucide-react';
import { Brand, Campaign, AuditRun, BrandRule } from '../types';
import { NavPage } from './Navigation';

interface OverviewViewProps {
  brand: Brand | null;
  campaigns: Campaign[];
  audits: AuditRun[];
  rules: BrandRule[];
  setActivePage: (page: NavPage) => void;
  onSelectCampaign: (campaign: Campaign) => void;
  onOpenNewCampaignModal: () => void;
  onRunAudit: () => Promise<void>;
  onOpenNewCompliance: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  brand,
  campaigns,
  audits,
  rules,
  setActivePage,
  onSelectCampaign,
  onOpenNewCampaignModal,
  onRunAudit,
  onOpenNewCompliance,
}) => {
  if (!brand) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-3">
        <h2 className="text-base font-semibold text-stone-800">No brand selected</h2>
        <p className="text-xs text-stone-500">Select or create a brand to get started.</p>
        <button
          onClick={() => setActivePage('brands')}
          className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100"
        >
          Open Brand Directory
        </button>
      </div>
    );
  }

  const brandCampaigns = campaigns.filter((c) => c.brandId === brand.id);
  const brandAudits = audits.filter((a) => a.brandId === brand.id);
  const brandRules = rules.filter((r) => r.brandId === brand.id && r.isActive && r.humanApprovalStatus === 'approved');

  const latestCampaign = brandCampaigns[0] || null;
  const latestAudit = brandAudits[0] || null;

  // System Readiness Check
  const hasBrand = !!brand;
  const hasRules = brandRules.length > 0;
  const hasDraft = !!(latestCampaign && latestCampaign.currentDraft.trim().length > 0);
  const isReadyToAudit = hasBrand && hasRules && hasDraft;

  const completedAudits = brandAudits.length;
  const scoredAudits = brandAudits.filter((a) => a.scoreCalculation.complianceScore !== null);
  const avgScore =
    scoredAudits.length > 0
      ? Math.round(
          scoredAudits.reduce((acc, a) => acc + (a.scoreCalculation.complianceScore || 0), 0) /
            scoredAudits.length
        )
      : null;

  const awaitingReviewCount = brandCampaigns.filter(
    (c) => c.status === 'needs_human_review' || c.status === 'ready_for_approval'
  ).length;

  const openCriticalViolations = latestAudit
    ? latestAudit.validatedFindings.filter(
        (f) => f.severity === 'critical' && f.resolutionStatus === 'open'
      ).length
    : 0;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Hero Interactive First Screen Welcome */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-2xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 uppercase tracking-wider">
              <span>{brand.name}</span>
              <span>·</span>
              <span>Brand Governance Workspace</span>
            </div>
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
              Create Confidently. Verify Intelligently. Publish Consistently.
            </h1>
            <p className="text-xs text-stone-600 leading-relaxed">
              Verify marketing copy against approved brand guidelines, disclaimers, and risk policies before release.
              Every check is grounded in exact source evidence.
            </p>
          </div>

          {/* Prominent Action Card */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={onOpenNewCompliance}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-[#4338CA] hover:bg-[#3730A3] text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start a New Compliance</span>
            </button>

            <button
              onClick={onOpenNewCampaignModal}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Campaign</span>
            </button>
          </div>
        </div>

        {/* Readiness Checklist Ribbon */}
        <div className="pt-4 border-t border-stone-100 flex flex-wrap items-center gap-6 text-xs">
          <span className="font-semibold text-stone-500 uppercase tracking-wider text-[10px]">
            Audit Readiness:
          </span>

          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-stone-700">Brand Active ({brand.name})</span>
          </div>

          <div className="flex items-center gap-1.5">
            {hasRules ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span className="text-stone-700">
              {brandRules.length} Approved Rule{brandRules.length !== 1 ? 's' : ''} Loaded
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {hasDraft ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span className="text-stone-700">Draft Content Ready</span>
          </div>

          {!hasRules && (
            <button
              onClick={() => setActivePage('guidelines')}
              className="text-xs font-semibold text-indigo-700 hover:underline"
            >
              + Upload brand guidelines now
            </button>
          )}
        </div>
      </div>

      {/* Quick Continue Draft & Actions Card */}
      {latestCampaign && (
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[11px] text-stone-500">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <span>Latest Working Draft</span>
              <span>·</span>
              <span className="font-mono">v{latestCampaign.draftVersion}</span>
              <span>·</span>
              <span>{latestCampaign.contentType.replace('_', ' ')}</span>
            </div>
            <h3 className="text-sm font-bold text-stone-900">{latestCampaign.name}</h3>
            <p className="text-xs text-stone-600 font-mono line-clamp-1">
              "{latestCampaign.currentDraft.substring(0, 90)}..."
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                onSelectCampaign(latestCampaign);
                setActivePage('editor');
              }}
              className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg shadow-2xs transition-colors"
            >
              Continue Editing
            </button>
            {latestCampaign.lastAuditId && (
              <button
                onClick={() => {
                  onSelectCampaign(latestCampaign);
                  setActivePage('audit-results');
                }}
                className="px-3.5 py-2 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg shadow-2xs transition-colors"
              >
                Inspect Audit Findings
              </button>
            )}
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <div className="text-xs font-medium text-stone-500">Active Campaigns</div>
          <div className="text-2xl font-bold text-stone-900 mt-2 font-mono tabular-nums">
            {brandCampaigns.length}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Governed by active guidelines</div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <div className="text-xs font-medium text-stone-500">Average Compliance</div>
          <div className="text-2xl font-bold text-stone-900 mt-2 font-mono tabular-nums">
            {avgScore !== null ? `${avgScore}%` : 'N/A'}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            {completedAudits > 0 ? `Across ${completedAudits} completed audits` : 'No audits completed'}
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <div className="text-xs font-medium text-stone-500">Awaiting Sign-off</div>
          <div className="text-2xl font-bold text-amber-700 mt-2 font-mono tabular-nums">
            {awaitingReviewCount}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Requires reviewer sign-off</div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <div className="text-xs font-medium text-stone-500">Open Critical Issues</div>
          <div
            className={`text-2xl font-bold mt-2 font-mono tabular-nums ${
              openCriticalViolations > 0 ? 'text-red-700' : 'text-emerald-700'
            }`}
          >
            {openCriticalViolations}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            {openCriticalViolations > 0 ? 'Blocking campaign publication' : 'Zero critical blocks'}
          </div>
        </div>
      </div>

      {/* Recent Campaigns Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-stone-900">Recent Campaigns</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Drafts and verification statuses for {brand.name}
            </p>
          </div>
          <button
            onClick={() => setActivePage('campaigns')}
            className="text-xs text-indigo-700 font-semibold hover:text-indigo-900 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {brandCampaigns.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-stone-600">No campaigns created yet</p>
            <p className="text-[11px] text-stone-400 mt-1">
              Create your first campaign to audit draft marketing copy.
            </p>
            <button
              onClick={onOpenNewCampaignModal}
              className="mt-3 px-3 py-1.5 text-xs bg-indigo-50 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-100 transition-colors"
            >
              Create First Campaign
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50/80 text-stone-500 uppercase tracking-wider text-[10px] font-semibold border-b border-stone-200">
                <tr>
                  <th className="px-6 py-3">Campaign Name</th>
                  <th className="px-6 py-3">Channel / Scope</th>
                  <th className="px-6 py-3">Draft Version</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {brandCampaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-stone-900">{camp.name}</div>
                      <div className="text-[11px] text-stone-400 mt-0.5">
                        Target: {camp.targetAudience}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-stone-600 capitalize">
                      {camp.contentType.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-stone-700">v{camp.draftVersion}</td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 font-medium capitalize text-xs ${
                          camp.status === 'approved' || camp.status === 'released'
                            ? 'text-emerald-700'
                            : camp.status === 'changes_required'
                            ? 'text-red-700'
                            : camp.status === 'needs_human_review'
                            ? 'text-amber-700'
                            : camp.status === 'ready_for_approval'
                            ? 'text-blue-700'
                            : 'text-stone-600'
                        }`}
                      >
                        {camp.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => {
                          onSelectCampaign(camp);
                          setActivePage('editor');
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 rounded transition-colors"
                      >
                        Edit Content
                      </button>
                      {camp.lastAuditId && (
                        <button
                          onClick={() => {
                            onSelectCampaign(camp);
                            setActivePage('audit-results');
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded transition-colors"
                        >
                          View Audit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Regression Verification Footer Strip */}
      <div className="p-5 bg-stone-50 border border-stone-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-stone-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            <span>Audit Engine & Invariant Verification</span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            INKLOOM runs deterministic boundary matching, semantic AI analysis, and evidence validation with zero hallucinated approvals.
          </p>
        </div>
        <button
          onClick={() => setActivePage('settings')}
          className="px-4 py-2 text-xs font-semibold text-stone-800 bg-white border border-stone-200 rounded-lg hover:bg-stone-100 transition-colors shrink-0 shadow-2xs"
        >
          Run Regression Test Suite
        </button>
      </div>
    </div>
  );
};
