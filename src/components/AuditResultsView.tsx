import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Check,
  X,
  Edit2,
  RotateCcw,
  Download,
  ArrowRight,
  HelpCircle,
  FileText,
  Sparkles,
  Calculator,
  ChevronRight,
} from 'lucide-react';
import { AuditRun, Finding, Campaign, Brand } from '../types';
import { NavPage } from './Navigation';
import { computeWordDiff, DiffPart } from '../utils/diff';
import { useToast } from './Toast';

interface AuditResultsViewProps {
  audit: AuditRun | null;
  campaign: Campaign | null;
  brand: Brand | null;
  onApplyCorrection: (finding: Finding, replacementText: string) => Promise<void>;
  onApplyAllCorrections: (corrections: { finding: Finding; replacement: string }[]) => Promise<void>;
  onDismissFinding: (findingId: string, reason: string) => void;
  onRunAudit: () => Promise<void>;
  setActivePage: (page: NavPage) => void;
  onOpenExportModal: () => void;
}

export const AuditResultsView: React.FC<AuditResultsViewProps> = ({
  audit,
  campaign,
  brand,
  onApplyCorrection,
  onApplyAllCorrections,
  onDismissFinding,
  onRunAudit,
  setActivePage,
  onOpenExportModal,
}) => {
  const { success, warning } = useToast();
  const [activeTab, setActiveTab] = useState<'findings' | 'quarantine' | 'passed' | 'diff'>('findings');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'major' | 'minor'>('all');
  const [editingFindingId, setEditingFindingId] = useState<string | null>(null);
  const [editedReplacement, setEditedReplacement] = useState<string>('');
  const [isApplying, setIsApplying] = useState(false);
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  if (!audit || !campaign || !brand) {
    return (
      <div className="p-8 text-center max-w-xl mx-auto space-y-4">
        <ShieldAlert className="w-10 h-10 text-stone-300 mx-auto" />
        <h2 className="text-base font-semibold text-stone-800">No audit results to display</h2>
        <p className="text-xs text-stone-500">
          Run a compliance audit from the Content Editor to evaluate the current draft against
          active brand guidelines.
        </p>
        <button
          onClick={() => setActivePage('editor')}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#4338CA] hover:bg-[#3730A3] rounded-lg shadow-xs"
        >
          Open Content Editor
        </button>
      </div>
    );
  }

  const { scoreCalculation, releaseRecommendation } = audit;
  const score = scoreCalculation.complianceScore;
  const isProvisional = scoreCalculation.isProvisional;

  const validatedFindings = audit.validatedFindings || [];
  const quarantinedFindings = audit.quarantinedFindings || [];
  const passedRules = scoreCalculation.ruleOutcomes?.filter((r) => r.outcome === 'pass') || [];

  const filteredFindings = validatedFindings.filter((f) => {
    if (severityFilter === 'all') return true;
    return f.severity === severityFilter;
  });

  const eligibleCorrections = validatedFindings.filter(
    (f) => f.resolutionStatus === 'open' && (f.suggestedCorrection || f.userCorrection)
  );

  const handleStartEdit = (f: Finding) => {
    setEditingFindingId(f.id);
    setEditedReplacement(f.userCorrection || f.suggestedCorrection || '');
  };

  const handleSaveAndApply = async (f: Finding) => {
    setIsApplying(true);
    try {
      await onApplyCorrection(f, editedReplacement);
      setEditingFindingId(null);
      success('Correction Applied', `Updated sentence: "${editedReplacement.substring(0, 30)}..."`);
    } finally {
      setIsApplying(false);
    }
  };

  const handleAcceptAll = async () => {
    if (!confirm(`Apply all ${eligibleCorrections.length} authorized corrections to draft?`)) return;
    setIsApplying(true);
    try {
      const payload = eligibleCorrections.map((f) => ({
        finding: f,
        replacement: f.userCorrection || f.suggestedCorrection || '',
      }));
      await onApplyAllCorrections(payload);
      success('Batch Corrections Applied', `Applied ${payload.length} corrections to draft.`);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Top Header & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-1">
            <span>Audit Run · {brand.name}</span>
            <span>·</span>
            <span>Draft v{audit.draftVersion}</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Compliance Audit Findings</h1>
          <p className="text-xs text-stone-500 mt-1">
            Audited on {new Date(audit.timestamp).toLocaleString()} via INKLOOM Engine v{audit.engineVersion}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenExportModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-stone-500" />
            <span>Export Audit Report</span>
          </button>
          <button
            onClick={() => setActivePage('review-approvals')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#4338CA] hover:bg-[#3730A3] rounded-lg transition-colors shadow-xs"
          >
            <span>Proceed to Sign-off</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {audit.aiRequestFailed && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-900 shadow-2xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-amber-950">
              Provisional Audit Assessment Mode
            </div>
            <div className="text-amber-800 leading-relaxed">
              {audit.aiFailureReason ||
                'External Gemini semantic analysis encountered an access restriction (403 Permission Denied). Inkloom executed full local deterministic and pattern-based verification on approved brand rules.'}
            </div>
          </div>
        </div>
      )}

      {/* Score and Release Recommendation Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Compliance Score Card */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Compliance Score
            </span>
            <button
              onClick={() => setShowFormulaModal(true)}
              className="text-[11px] text-indigo-700 hover:text-indigo-900 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Calculator className="w-3 h-3" />
              <span>How is this calculated?</span>
            </button>
          </div>

          <div className="flex items-baseline gap-2">
            <span
              className={`text-4xl font-bold font-mono tabular-nums ${
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
            {score !== null && (
              <span className="text-xs text-stone-400 font-medium">/ 100% Target</span>
            )}
          </div>

          {isProvisional && (
            <div className="text-[11px] text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200 font-medium">
              Provisional Assessment: Semantic checks were uncompleted. Score reflects deterministic rules.
            </div>
          )}

          <div className="text-[11px] text-stone-500 pt-2 border-t border-stone-100 font-mono">
            Penalty: {scoreCalculation.potentialPenalty} / Max: {scoreCalculation.maxPenalty}
          </div>
        </div>

        {/* Release Status Card */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-2xs space-y-3 md:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Release Recommendation
            </span>
            <span
              className={`text-xs font-bold capitalize px-2.5 py-0.5 rounded ${
                releaseRecommendation.allowsRelease
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {releaseRecommendation.recommendedStatus.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="space-y-1.5">
            {releaseRecommendation.blockingReasons.length > 0 ? (
              <div className="space-y-1">
                <div className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                  <span>Release Blocked:</span>
                </div>
                {releaseRecommendation.blockingReasons.map((reason, idx) => (
                  <div key={idx} className="text-xs text-red-700 pl-5">
                    • {reason}
                  </div>
                ))}
              </div>
            ) : releaseRecommendation.requiresReviewReasons.length > 0 ? (
              <div className="space-y-1">
                <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Human Review Required:</span>
                </div>
                {releaseRecommendation.requiresReviewReasons.map((r, idx) => (
                  <div key={idx} className="text-xs text-amber-800 pl-5">
                    • {r}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-emerald-700 flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>All brand compliance rules verified. Campaign is eligible for approval sign-off.</span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-stone-100 flex items-center gap-4 text-xs text-stone-500 font-mono tabular-nums">
            <button
              onClick={() => setSeverityFilter('critical')}
              className={`hover:underline cursor-pointer ${severityFilter === 'critical' ? 'font-bold text-red-700' : ''}`}
            >
              Critical: {scoreCalculation.criticalCount}
            </button>
            <span>·</span>
            <button
              onClick={() => setSeverityFilter('major')}
              className={`hover:underline cursor-pointer ${severityFilter === 'major' ? 'font-bold text-amber-700' : ''}`}
            >
              Major: {scoreCalculation.majorCount}
            </button>
            <span>·</span>
            <button
              onClick={() => setSeverityFilter('minor')}
              className={`hover:underline cursor-pointer ${severityFilter === 'minor' ? 'font-bold text-stone-800' : ''}`}
            >
              Minor: {scoreCalculation.minorCount}
            </button>
            {severityFilter !== 'all' && (
              <button
                onClick={() => setSeverityFilter('all')}
                className="text-indigo-700 font-medium hover:underline ml-2"
              >
                (Reset filter)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200">
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setActiveTab('findings')}
            className={`pb-3 font-semibold px-2 transition-colors border-b-2 -mb-[2px] ${
              activeTab === 'findings'
                ? 'border-indigo-600 text-indigo-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Violations ({filteredFindings.length})
          </button>
          <button
            onClick={() => setActiveTab('quarantine')}
            className={`pb-3 font-semibold px-2 transition-colors border-b-2 -mb-[2px] ${
              activeTab === 'quarantine'
                ? 'border-indigo-600 text-indigo-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Needs Evidence / Quarantined ({quarantinedFindings.length})
          </button>
          <button
            onClick={() => setActiveTab('passed')}
            className={`pb-3 font-semibold px-2 transition-colors border-b-2 -mb-[2px] ${
              activeTab === 'passed'
                ? 'border-indigo-600 text-indigo-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Passed Checks ({passedRules.length})
          </button>
          <button
            onClick={() => setActiveTab('diff')}
            className={`pb-3 font-semibold px-2 transition-colors border-b-2 -mb-[2px] ${
              activeTab === 'diff'
                ? 'border-indigo-600 text-indigo-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Original vs Revised Diff
          </button>
        </div>

        {activeTab === 'findings' && eligibleCorrections.length > 0 && (
          <button
            onClick={handleAcceptAll}
            disabled={isApplying}
            className="mb-2 sm:mb-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Accept All Eligible Corrections ({eligibleCorrections.length})</span>
          </button>
        )}
      </div>

      {/* TAB 1: VALIDATED FINDINGS */}
      {activeTab === 'findings' && (
        <div className="space-y-4">
          {filteredFindings.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-xl p-10 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-bold text-stone-900">Zero Compliance Violations Found</h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                The current campaign draft conforms to all evaluated brand governance rules.
              </p>
            </div>
          ) : (
            filteredFindings.map((finding) => {
              const isEditing = editingFindingId === finding.id;

              return (
                <div
                  key={finding.id}
                  className="bg-white border border-stone-200 rounded-xl p-5 shadow-2xs space-y-4 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className={`font-semibold capitalize px-2 py-0.5 rounded text-[11px] ${
                            finding.severity === 'critical'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : finding.severity === 'major'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-stone-100 text-stone-700 border border-stone-200'
                          }`}
                        >
                          {finding.severity}
                        </span>
                        <span className="text-stone-400">·</span>
                        <span className="text-stone-600 font-medium capitalize">
                          {finding.ruleCategory.replace(/_/g, ' ')}
                        </span>
                        <span className="text-stone-400">·</span>
                        <span className="text-stone-400 text-[11px] font-mono">
                          Rule: {finding.ruleId}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-stone-900">{finding.ruleDescription}</h3>
                    </div>

                    <div className="text-[11px] text-stone-400 font-mono">
                      Pos: {finding.location.startChar}–{finding.location.endChar}
                    </div>
                  </div>

                  {/* Quoted Text Excerpt */}
                  <div className="p-3 bg-red-50/60 border border-red-200/80 rounded-lg text-xs space-y-1">
                    <span className="font-semibold text-red-900 block text-[11px] uppercase tracking-wider">
                      Flagged Draft Statement:
                    </span>
                    <span className="font-mono text-red-950 font-medium text-xs">
                      "{finding.quotedText}"
                    </span>
                  </div>

                  {/* Explanation and Evidence */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                    <div className="space-y-1">
                      <span className="font-semibold text-stone-700 block">Why it was flagged:</span>
                      <p className="text-stone-600 leading-relaxed">{finding.explanation}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="font-semibold text-stone-700 block">Guideline Evidence:</span>
                      <p className="text-stone-600 italic bg-stone-50 p-2.5 rounded border border-stone-100">
                        "{finding.evidence}"
                      </p>
                    </div>
                  </div>

                  {/* Correction Workflow */}
                  {(finding.suggestedCorrection || isEditing) && (
                    <div className="pt-3 border-t border-stone-100 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-emerald-800 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Authorized Correction:</span>
                        </span>
                        {!isEditing && (
                          <button
                            onClick={() => handleStartEdit(finding)}
                            className="text-stone-500 hover:text-stone-800 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit Proposal</span>
                          </button>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            rows={2}
                            value={editedReplacement}
                            onChange={(e) => setEditedReplacement(e.target.value)}
                            className="w-full p-2 border border-stone-300 rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-600"
                          />
                          <div className="flex justify-end gap-2 text-xs">
                            <button
                              onClick={() => setEditingFindingId(null)}
                              className="px-2.5 py-1 text-stone-600 hover:text-stone-800 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveAndApply(finding)}
                              disabled={isApplying}
                              className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg shadow-xs cursor-pointer"
                            >
                              Apply to Draft
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-lg">
                          <div className="text-xs font-mono text-emerald-950 font-medium">
                            "{finding.userCorrection || finding.suggestedCorrection}"
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() =>
                                onApplyCorrection(
                                  finding,
                                  finding.userCorrection || finding.suggestedCorrection || ''
                                )
                              }
                              disabled={isApplying}
                              className="px-3 py-1 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>Accept Correction</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: QUARANTINED FINDINGS */}
      {activeTab === 'quarantine' && (
        <div className="space-y-4">
          {quarantinedFindings.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-xl p-8 text-center text-xs text-stone-500">
              Zero quarantined findings. All model citations and quotations validated successfully.
            </div>
          ) : (
            quarantinedFindings.map((qf) => (
              <div
                key={qf.id}
                className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 text-xs space-y-2 shadow-2xs"
              >
                <div className="flex items-center gap-2 text-amber-900 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Quarantined Citation ({qf.ruleId})</span>
                </div>
                <div className="font-mono text-stone-700">"{qf.quotedText}"</div>
                <div className="text-stone-600">{qf.explanation}</div>
                {qf.validationIssues && (
                  <div className="p-2 bg-amber-100/70 rounded text-[11px] text-amber-900 font-medium">
                    Validation Issues: {qf.validationIssues.join('; ')}
                  </div>
                )}
                <div className="text-[11px] text-stone-400">
                  Status: Not counted as confirmed violation in score calculation.
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: PASSED CHECKS */}
      {activeTab === 'passed' && (
        <div className="space-y-3">
          {passedRules.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-xl p-8 text-center text-xs text-stone-500">
              No passed checks recorded for this run.
            </div>
          ) : (
            passedRules.map((pr) => (
              <div
                key={pr.ruleId}
                className="bg-white border border-stone-200 rounded-xl p-3.5 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-stone-900">{pr.ruleDescription}</div>
                    <div className="text-[11px] text-stone-400 font-mono">Rule ID: {pr.ruleId}</div>
                  </div>
                </div>
                <span className="text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-2 py-0.5 rounded">
                  Passed
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: ORIGINAL VS REVISED DIFF */}
      {activeTab === 'diff' && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-stone-900">Word-Level Draft Comparison</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Green text highlights additions and accepted corrections; red strikeout indicates removed violations.
            </p>
          </div>

          <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl font-mono text-xs leading-loose text-stone-800">
            {computeWordDiff(audit.validatedFindings[0]?.quotedText || '', campaign.currentDraft).map(
              (part, i) => {
                if (part.added) {
                  return (
                    <span
                      key={i}
                      className="bg-emerald-100 text-emerald-900 font-semibold px-1 py-0.5 rounded mx-0.5"
                    >
                      {part.value}
                    </span>
                  );
                }
                if (part.removed) {
                  return (
                    <span
                      key={i}
                      className="bg-red-100 text-red-900 line-through px-1 py-0.5 rounded mx-0.5"
                    >
                      {part.value}
                    </span>
                  );
                }
                return <span key={i}>{part.value}</span>;
              }
            )}
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-stone-400">Draft Version: v{campaign.draftVersion}</span>
            <button
              onClick={onRunAudit}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#4338CA] hover:bg-[#3730A3] rounded-lg shadow-xs cursor-pointer"
            >
              Re-run Audit on Revised Draft
            </button>
          </div>
        </div>
      )}

      {/* "How is this calculated?" Interactive Drawer Modal */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-stone-200 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-indigo-600" />
                <h3 className="text-base font-bold text-stone-900">How the Compliance Score is Calculated</h3>
              </div>
              <button
                onClick={() => setShowFormulaModal(false)}
                className="text-stone-400 hover:text-stone-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-3 text-stone-700">
              <p>
                INKLOOM AI calculates compliance scores deterministically using transparent weights
                rather than asking an AI to guess a percentage:
              </p>

              <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 font-mono text-[11px] space-y-1">
                <div>• Critical finding weight: <strong>10</strong></div>
                <div>• Major finding weight: <strong>5</strong></div>
                <div>• Minor finding weight: <strong>2</strong></div>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-stone-900">Mathematical Formula:</span>
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg font-mono text-indigo-950 font-bold">
                  Compliance Score = 100 × (1 − Potential Penalty / Maximum Penalty)
                </div>
              </div>

              <div className="p-3 bg-stone-50 rounded-lg text-stone-600 text-[11px] space-y-1">
                <div>
                  <strong>Potential Penalty:</strong> Sum of weights of confirmed violations ({scoreCalculation.potentialPenalty}).
                </div>
                <div>
                  <strong>Maximum Penalty:</strong> Sum of weights of all applicable, assessable rules ({scoreCalculation.maxPenalty}).
                </div>
                <div>
                  <strong>Current Run:</strong> {scoreCalculation.formulaExplanation}
                </div>
              </div>

              <p className="text-[11px] text-stone-400 italic">
                Notice: The score is a rule-based compliance indicator, not a guarantee of legal clearance.
              </p>
            </div>

            <div className="flex justify-end pt-2 border-t border-stone-100">
              <button
                onClick={() => setShowFormulaModal(false)}
                className="px-4 py-1.5 bg-[#4338CA] text-white text-xs font-semibold rounded-lg"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
