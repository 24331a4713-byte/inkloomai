import React from 'react';
import { Download, Printer, X, ShieldCheck, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { AuditRun, Campaign, Brand } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  audit: AuditRun | null;
  campaign: Campaign | null;
  brand: Brand | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  audit,
  campaign,
  brand,
}) => {
  if (!isOpen || !audit || !campaign || !brand) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCsv = () => {
    const rows = [
      ['Finding ID', 'Severity', 'Category', 'Rule Description', 'Quoted Draft Excerpt', 'Guideline Evidence', 'Suggested Correction', 'Resolution Status'],
      ...audit.validatedFindings.map((f) => [
        `"${f.id}"`,
        `"${f.severity}"`,
        `"${f.ruleCategory}"`,
        `"${f.ruleDescription.replace(/"/g, '""')}"`,
        `"${f.quotedText.replace(/"/g, '""')}"`,
        `"${f.evidence.replace(/"/g, '""')}"`,
        `"${(f.suggestedCorrection || '').replace(/"/g, '""')}"`,
        `"${f.resolutionStatus}"`,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inkloom_audit_${campaign.id}_v${audit.draftVersion}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-stone-200 max-w-3xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] flex flex-col">
        {/* Modal Controls */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <h3 className="text-base font-bold text-stone-900">Compliance Audit Traceability Report</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#4338CA] hover:bg-[#3730A3] rounded-lg shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button onClick={onClose} className="p-1.5 text-stone-400 hover:text-stone-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Audit Report Body */}
        <div className="flex-1 overflow-y-auto space-y-6 text-xs text-stone-800 pr-2">
          {/* Document Header */}
          <div className="border-b border-stone-200 pb-4 flex justify-between items-start">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-700">
                INKLOOM AI Brand Governance Report
              </div>
              <h1 className="text-xl font-bold text-stone-900 mt-1">{campaign.name}</h1>
              <div className="text-xs text-stone-500 mt-0.5">
                Brand: <strong>{brand.name}</strong> · Industry: {brand.industry}
              </div>
            </div>
            <div className="text-right text-[11px] text-stone-500 font-mono">
              <div>Date: {new Date(audit.timestamp).toLocaleDateString()}</div>
              <div>Audit Run ID: {audit.id}</div>
              <div>Draft Version: v{audit.draftVersion}</div>
            </div>
          </div>

          {/* Scores & Metrics Summary */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-stone-50 rounded-xl border border-stone-200">
            <div>
              <span className="text-[10px] uppercase font-semibold text-stone-400 block">
                Compliance Score
              </span>
              <span className="text-2xl font-bold font-mono text-stone-900">
                {audit.scoreCalculation.complianceScore !== null
                  ? `${audit.scoreCalculation.complianceScore}%`
                  : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-stone-400 block">
                Release Decision
              </span>
              <span className="text-sm font-bold capitalize text-stone-900 mt-1 block">
                {audit.releaseRecommendation.recommendedStatus.replace(/_/g, ' ')}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-stone-400 block">
                Violations Found
              </span>
              <span className="text-sm font-bold font-mono text-stone-900 mt-1 block">
                {audit.validatedFindings.length} ({audit.scoreCalculation.criticalCount} Critical)
              </span>
            </div>
          </div>

          {/* Formula Explanation */}
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg font-mono text-[11px] text-stone-600">
            <strong>Calculation Method:</strong> {audit.scoreCalculation.formulaExplanation}
          </div>

          {/* Findings Table */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
              Traceable Violation Findings
            </h4>
            {audit.validatedFindings.length === 0 ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-lg text-xs">
                Zero compliance violations detected in submitted copy.
              </div>
            ) : (
              <div className="border border-stone-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-[10px] uppercase font-semibold text-stone-500">
                    <tr>
                      <th className="p-2.5">Severity</th>
                      <th className="p-2.5">Rule / Issue</th>
                      <th className="p-2.5">Quoted Text</th>
                      <th className="p-2.5">Authorized Correction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {audit.validatedFindings.map((f) => (
                      <tr key={f.id} className="align-top">
                        <td className="p-2.5 font-bold uppercase text-[10px]">
                          <span
                            className={
                              f.severity === 'critical'
                                ? 'text-red-700'
                                : f.severity === 'major'
                                ? 'text-amber-700'
                                : 'text-stone-600'
                            }
                          >
                            {f.severity}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <div className="font-semibold text-stone-900">{f.ruleDescription}</div>
                          <div className="text-[10px] text-stone-400 mt-0.5 italic">
                            Evidence: "{f.evidence}"
                          </div>
                        </td>
                        <td className="p-2.5 font-mono text-[11px] text-red-900 bg-red-50/40">
                          "{f.quotedText}"
                        </td>
                        <td className="p-2.5 font-mono text-[11px] text-emerald-900 bg-emerald-50/40">
                          {f.suggestedCorrection || 'None required'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Governing Brand Policies Provenance */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
              Active Guideline Sources Evaluated
            </h4>
            <div className="border border-stone-200 rounded-lg p-3 bg-stone-50/50 text-[11px] space-y-1">
              <div>
                Brand: <strong>{brand.name}</strong>
              </div>
              <div>
                Active Rule IDs in Scope: {audit.applicableRuleIds.join(', ')}
              </div>
              <div className="text-stone-500">
                Evaluation Engine: INKLOOM AI Hybrid Pipeline v{audit.engineVersion}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
