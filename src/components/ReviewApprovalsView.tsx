import React, { useState } from 'react';
import {
  ClipboardCheck,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  ArrowRight,
} from 'lucide-react';
import { Campaign, Brand, AuditRun, ApprovalRecord } from '../types';
import { NavPage } from './Navigation';
import { useToast } from './Toast';

interface ReviewApprovalsViewProps {
  campaign: Campaign | null;
  brand: Brand | null;
  latestAudit: AuditRun | null;
  approvals: ApprovalRecord[];
  onApproveCampaign: (data: {
    auditId: string;
    action: 'approved' | 'rejected' | 'released';
    reviewerName: string;
    reviewerRole: string;
    comments: string;
  }) => Promise<void>;
  setActivePage: (page: NavPage) => void;
}

export const ReviewApprovalsView: React.FC<ReviewApprovalsViewProps> = ({
  campaign,
  brand,
  latestAudit,
  approvals,
  onApproveCampaign,
  setActivePage,
}) => {
  const { success, error, warning } = useToast();
  const [reviewerName, setReviewerName] = useState('Dr. Elena Vance');
  const [reviewerRole, setReviewerRole] = useState('Lead Compliance Reviewer');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!campaign || !brand) {
    return (
      <div className="p-8 text-center max-w-xl mx-auto space-y-3">
        <ClipboardCheck className="w-10 h-10 text-stone-300 mx-auto" />
        <h2 className="text-base font-semibold text-stone-800">No campaign selected for review</h2>
        <p className="text-xs text-stone-500">
          Select an active campaign to inspect its compliance certification and record formal sign-off.
        </p>
        <button
          onClick={() => setActivePage('campaigns')}
          className="px-3.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100"
        >
          View Campaigns
        </button>
      </div>
    );
  }

  // Verification checks for release
  const isStale =
    latestAudit && campaign.draftVersion !== latestAudit.draftVersion;

  const openCriticals = latestAudit
    ? latestAudit.validatedFindings.filter(
        (f) => f.severity === 'critical' && f.resolutionStatus === 'open'
      )
    : [];

  const openMajors = latestAudit
    ? latestAudit.validatedFindings.filter(
        (f) => f.severity === 'major' && f.resolutionStatus === 'open'
      )
    : [];

  const canApprove = latestAudit && !isStale && openCriticals.length === 0;

  // Visual Publication Workflow Steps
  const workflowSteps = [
    { id: 'draft', label: '1. Draft', completed: true },
    { id: 'audited', label: '2. Audit', completed: !!latestAudit },
    {
      id: 'fix',
      label: '3. Fix Issues',
      completed: !!latestAudit && openCriticals.length === 0,
      active: openCriticals.length > 0,
    },
    {
      id: 'review',
      label: '4. Human Review',
      completed: campaign.status === 'approved' || campaign.status === 'released',
      active: campaign.status === 'needs_human_review' || campaign.status === 'ready_for_approval',
    },
    {
      id: 'approved',
      label: '5. Approved',
      completed: campaign.status === 'approved' || campaign.status === 'released',
    },
    { id: 'released', label: '6. Released', completed: campaign.status === 'released' },
  ];

  const handleAction = async (action: 'approved' | 'rejected' | 'released') => {
    if (!latestAudit) return;
    setActionError(null);
    setIsSubmitting(true);
    try {
      await onApproveCampaign({
        auditId: latestAudit.id,
        action,
        reviewerName,
        reviewerRole,
        comments,
      });
      setComments('');
      if (action === 'approved') success('Campaign Approved', 'Approved for channel publication.');
      if (action === 'released') success('Formal Release Recorded', 'Sign-off complete. Campaign released.');
      if (action === 'rejected') warning('Campaign Rejected', 'Status marked as rejected.');
    } catch (err: any) {
      setActionError(err.message || 'Approval sign-off failed.');
      error('Action Blocked', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-stone-200 pb-6">
        <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-1">
          Formal Governance Sign-Off · {brand.name}
        </div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Review & Approvals</h1>
        <p className="text-xs text-stone-500 mt-1 max-w-2xl">
          Authorized personnel record binding approval or release decisions against traceable audit records.
        </p>
      </div>

      {/* Visual Workflow Stepper */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs">
        <div className="text-[10px] uppercase font-bold text-stone-400 tracking-wider mb-3">
          Publication Sequence Workflow:
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {workflowSteps.map((s, idx) => (
            <React.Fragment key={s.id}>
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  s.completed
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : s.active
                    ? 'bg-amber-50 text-amber-800 border border-amber-200 font-bold'
                    : 'bg-stone-50 text-stone-400 border border-stone-200'
                }`}
              >
                {s.completed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : s.active ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-stone-300" />
                )}
                <span>{s.label}</span>
              </div>
              {idx < workflowSteps.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-stone-300" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Certification Status Summary */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
          <div>
            <h2 className="text-base font-bold text-stone-900">{campaign.name}</h2>
            <div className="text-xs text-stone-500 mt-0.5">
              Draft Version: v{campaign.draftVersion} · Channel: {campaign.contentType}
            </div>
          </div>
          <span
            className={`text-xs font-bold capitalize px-3 py-1 rounded-full ${
              campaign.status === 'approved' || campaign.status === 'released'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : campaign.status === 'changes_required'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-stone-100 text-stone-800'
            }`}
          >
            Status: {campaign.status.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Blocking Violations List */}
        {openCriticals.length > 0 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs space-y-2">
            <div className="font-bold text-red-900 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span>Release Blocked: {openCriticals.length} Unresolved Critical Violation(s)</span>
            </div>
            <ul className="list-disc pl-5 text-red-800 space-y-1">
              {openCriticals.map((c) => (
                <li key={c.id}>
                  "{c.quotedText}" — {c.ruleDescription}
                </li>
              ))}
            </ul>
          </div>
        )}

        {isStale && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs flex items-center gap-2 text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Draft was updated after audit. Content must be re-audited before sign-off can proceed.
            </span>
          </div>
        )}

        {actionError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 font-medium">
            {actionError}
          </div>
        )}
      </div>

      {/* Sign-off Form */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-stone-900">Execute Formal Governance Decision</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-semibold text-stone-700 block mb-1">Reviewer Name *</label>
            <input
              type="text"
              required
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="font-semibold text-stone-700 block mb-1">Reviewer Role *</label>
            <input
              type="text"
              required
              value={reviewerRole}
              onChange={(e) => setReviewerRole(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
            />
          </div>
        </div>

        <div className="text-xs">
          <label className="font-semibold text-stone-700 block mb-1">
            Sign-Off Notes & Review Justification
          </label>
          <textarea
            rows={3}
            placeholder="Record review notes, verification context, or release approval instructions..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
          />
        </div>

        <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-end gap-3 text-xs">
          <button
            onClick={() => handleAction('rejected')}
            disabled={isSubmitting}
            className="px-4 py-2 text-red-700 bg-red-50 hover:bg-red-100 font-semibold rounded-lg border border-red-200 transition-colors cursor-pointer"
          >
            Reject Campaign
          </button>
          <button
            onClick={() => handleAction('approved')}
            disabled={isSubmitting || !canApprove}
            className="px-4 py-2 text-white bg-indigo-700 hover:bg-indigo-800 disabled:opacity-40 font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approve for Publication</span>
          </button>
          <button
            onClick={() => handleAction('released')}
            disabled={isSubmitting || !canApprove}
            className="px-4 py-2 text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Formal Release Sign-Off</span>
          </button>
        </div>
      </div>

      {/* Historical Approvals Log */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-stone-200">
          <h3 className="text-sm font-bold text-stone-900">Governance Audit Trail</h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Immutable log of all review actions, sign-offs, and rejections.
          </p>
        </div>

        {approvals.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500">
            No formal review actions recorded yet for this campaign.
          </div>
        ) : (
          <div className="divide-y divide-stone-100 text-xs">
            {approvals.map((appr) => (
              <div key={appr.id} className="p-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-semibold capitalize px-2 py-0.5 rounded text-[11px] ${
                        appr.action === 'approved' || appr.action === 'released'
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-red-50 text-red-800'
                      }`}
                    >
                      {appr.action}
                    </span>
                    <span className="font-bold text-stone-900">{appr.reviewerName}</span>
                    <span className="text-stone-400">({appr.reviewerRole})</span>
                  </div>
                  {appr.comments && (
                    <p className="text-stone-600 pl-2 border-l border-stone-200 mt-1 italic">
                      "{appr.comments}"
                    </p>
                  )}
                </div>
                <div className="text-[11px] text-stone-400 font-mono shrink-0">
                  {new Date(appr.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
