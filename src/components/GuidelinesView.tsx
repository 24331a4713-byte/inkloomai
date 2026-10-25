import React, { useState } from 'react';
import {
  Upload,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  FileText,
  Plus,
  Trash2,
  Check,
  X,
  Eye,
  Filter,
} from 'lucide-react';
import { Brand, GuidelineDocument, BrandRule, RuleCategory, SeverityLevel, RuleType, ContentScope } from '../types';

interface GuidelinesViewProps {
  brand: Brand | null;
  documents: GuidelineDocument[];
  rules: BrandRule[];
  onUploadDocument: (data: {
    title: string;
    fileName: string;
    fileType: string;
    textContent: string;
  }) => Promise<{ document: GuidelineDocument; candidateRules: BrandRule[] }>;
  onConfirmRules: (rules: BrandRule[]) => Promise<void>;
  onCreateManualRule: (rule: Partial<BrandRule>) => Promise<void>;
  onUpdateRule: (id: string, updates: Partial<BrandRule>) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
}

export const GuidelinesView: React.FC<GuidelinesViewProps> = ({
  brand,
  documents,
  rules,
  onUploadDocument,
  onConfirmRules,
  onCreateManualRule,
  onUpdateRule,
  onDeleteRule,
}) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'upload' | 'documents'>('rules');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedDocPreview, setSelectedDocPreview] = useState<GuidelineDocument | null>(null);

  // Upload & Extraction Form
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadText, setUploadText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [candidateRules, setCandidateRules] = useState<BrandRule[]>([]);
  const [extractionCompleted, setExtractionCompleted] = useState(false);

  // Manual Rule Form
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualDesc, setManualDesc] = useState('');
  const [manualCategory, setManualCategory] = useState<RuleCategory>('prohibited_claims');
  const [manualSeverity, setManualSeverity] = useState<SeverityLevel>('critical');
  const [manualType, setManualType] = useState<RuleType>('deterministic');
  const [manualPattern, setManualPattern] = useState('');
  const [manualReplacement, setManualReplacement] = useState('');
  const [manualExcerpt, setManualExcerpt] = useState('');
  const [manualSection, setManualSection] = useState('General');

  if (!brand) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-base font-semibold text-stone-800">No brand selected</h2>
        <p className="text-xs text-stone-500 mt-1">Select a brand to view and manage guidelines.</p>
      </div>
    );
  }

  const brandRules = rules.filter((r) => r.brandId === brand.id);
  const brandDocuments = documents.filter((d) => d.brandId === brand.id);

  const filteredRules = brandRules.filter((r) => {
    if (filterCategory === 'all') return true;
    return r.category === filterCategory;
  });

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadText.trim()) return;

    setIsExtracting(true);
    try {
      const res = await onUploadDocument({
        title: uploadTitle.trim() || 'Uploaded Brand Guidelines',
        fileName: 'guidelines.txt',
        fileType: 'text/plain',
        textContent: uploadText,
      });
      setCandidateRules(res.candidateRules);
      setExtractionCompleted(true);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleApproveAllCandidates = async () => {
    const approved = candidateRules.map((r) => ({
      ...r,
      humanApprovalStatus: 'approved' as const,
      isActive: true,
    }));
    await onConfirmRules(approved);
    setExtractionCompleted(false);
    setCandidateRules([]);
    setUploadText('');
    setUploadTitle('');
    setActiveTab('rules');
  };

  const handleToggleCandidate = (index: number) => {
    setCandidateRules((prev) =>
      prev.map((r, i) =>
        i === index
          ? {
              ...r,
              humanApprovalStatus: r.humanApprovalStatus === 'approved' ? 'rejected' : 'approved',
            }
          : r
      )
    );
  };

  const handleCreateManualRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDesc.trim()) return;

    await onCreateManualRule({
      brandId: brand.id,
      sourceDocId: brandDocuments[0]?.id || 'manual-entry',
      sourceDocTitle: brandDocuments[0]?.title || 'Direct Configuration',
      sourceDocVersion: 1,
      sourceExcerpt: manualExcerpt || manualDesc,
      pageOrSection: manualSection,
      category: manualCategory,
      ruleDescription: manualDesc,
      ruleType: manualType,
      severity: manualSeverity,
      scope: 'all',
      detectionPattern: manualPattern || undefined,
      targetReplacement: manualReplacement || undefined,
      isActive: true,
      humanApprovalStatus: 'approved',
    });

    setShowManualModal(false);
    setManualDesc('');
    setManualPattern('');
    setManualReplacement('');
    setManualExcerpt('');
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-1">
            Governing Policy Base · {brand.name}
          </div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            Brand Guidelines & Rules
          </h1>
          <p className="text-xs text-stone-500 mt-1 max-w-2xl">
            Audit accuracy directly depends on active, human-approved rules. Upload source documents
            or configure deterministic and semantic checks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Rule Manually</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#4338CA] hover:bg-[#3730A3] rounded-lg transition-colors shadow-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Guidelines</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 text-xs">
        <button
          onClick={() => setActiveTab('rules')}
          className={`pb-3 font-semibold px-2 transition-colors border-b-2 -mb-[2px] ${
            activeTab === 'rules'
              ? 'border-indigo-600 text-indigo-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Active Rules ({brandRules.length})
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`pb-3 font-semibold px-2 transition-colors border-b-2 -mb-[2px] ${
            activeTab === 'upload'
              ? 'border-indigo-600 text-indigo-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Document Ingestion & Extraction
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`pb-3 font-semibold px-2 transition-colors border-b-2 -mb-[2px] ${
            activeTab === 'documents'
              ? 'border-indigo-600 text-indigo-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Source Documents ({brandDocuments.length})
        </button>
      </div>

      {/* TAB 1: RULES LIST */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          {/* Category Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50/70 p-2.5 rounded-lg border border-stone-200">
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <Filter className="w-3.5 h-3.5 text-stone-400" />
              <span>Filter Category:</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-white border border-stone-200 rounded px-2 py-1 text-xs text-stone-700"
              >
                <option value="all">All Categories</option>
                <option value="prohibited_claims">Prohibited Claims</option>
                <option value="unsupported_factual_claims">Unsupported Claims</option>
                <option value="required_disclaimers">Required Disclaimers</option>
                <option value="brand_spelling_naming">Brand Spelling & Naming</option>
                <option value="preferred_terminology">Preferred Terminology</option>
                <option value="color_rules">Color Rules</option>
                <option value="logo_usage">Logo Usage</option>
              </select>
            </div>

            <div className="text-xs text-stone-500 font-mono tabular-nums">
              Showing {filteredRules.length} of {brandRules.length} rules
            </div>
          </div>

          {filteredRules.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-xl p-12 text-center">
              <BookOpen className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-stone-800">No active rules for this brand</h3>
              <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                Without active approved rules, Inkloom cannot perform brand compliance auditing.
                Upload brand guidelines or create rules above.
              </p>
              <button
                onClick={() => setActiveTab('upload')}
                className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                Upload Guideline Document
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRules.map((rule) => {
                return (
                  <div
                    key={rule.id}
                    className="bg-white border border-stone-200 rounded-xl p-4 transition-all hover:border-stone-300 shadow-2xs"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span
                            className={`font-semibold capitalize px-2 py-0.5 rounded text-[11px] ${
                              rule.severity === 'critical'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : rule.severity === 'major'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-stone-100 text-stone-700 border border-stone-200'
                            }`}
                          >
                            {rule.severity}
                          </span>
                          <span className="text-stone-400">·</span>
                          <span className="text-stone-600 capitalize">
                            {rule.category.replace(/_/g, ' ')}
                          </span>
                          <span className="text-stone-400">·</span>
                          <span className="text-stone-500 text-[11px] font-mono">
                            Type: {rule.ruleType}
                          </span>
                          <span className="text-stone-400">·</span>
                          <span className="text-stone-400 text-[11px]">
                            Source: {rule.sourceDocTitle} ({rule.pageOrSection})
                          </span>
                        </div>

                        <h4 className="text-sm font-semibold text-stone-900">
                          {rule.ruleDescription}
                        </h4>

                        {rule.detectionPattern && (
                          <div className="text-xs text-stone-600 bg-stone-50 rounded p-2 font-mono text-[11px] border border-stone-200/60">
                            <span className="text-stone-400 font-sans font-medium mr-1.5">Pattern:</span>
                            "{rule.detectionPattern}"
                          </div>
                        )}

                        {rule.targetReplacement && (
                          <div className="text-xs text-emerald-800 bg-emerald-50/60 rounded p-2 text-[11px] border border-emerald-200/60">
                            <span className="text-emerald-700 font-medium mr-1.5">Approved Alternative:</span>
                            "{rule.targetReplacement}"
                          </div>
                        )}

                        <div className="text-[11px] text-stone-500 italic pt-1">
                          "{rule.sourceExcerpt}"
                        </div>
                      </div>

                      {/* Rule Controls */}
                      <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0">
                        <label className="flex items-center gap-1.5 text-xs text-stone-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rule.isActive}
                            onChange={(e) => onUpdateRule(rule.id, { isActive: e.target.checked })}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>Active</span>
                        </label>
                        <button
                          onClick={() => onDeleteRule(rule.id)}
                          className="p-1.5 text-stone-400 hover:text-red-600 transition-colors"
                          title="Delete Rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: UPLOAD & EXTRACTION */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          {!extractionCompleted ? (
            <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-2xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Upload & Extract Brand Guidelines</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Paste guideline text or document copy below. Inkloom will extract candidate rules
                  for your review. A heading such as "Avoid Misleading Claims" will not ban the word "claims".
                </p>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    Guideline Document Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Solaria 2026 Brand Governance & Claims Manual"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    Guideline Text Content *
                  </label>
                  <textarea
                    rows={10}
                    required
                    placeholder="Paste brand guidelines, prohibited claims, required disclaimers, or tone rules here..."
                    value={uploadText}
                    onChange={(e) => setUploadText(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 font-mono text-xs leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-[11px] text-stone-400">
                    Supports Markdown, plain text, and structured rules.
                  </div>
                  <button
                    type="submit"
                    disabled={isExtracting || !uploadText.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-[#4338CA] hover:bg-[#3730A3] disabled:opacity-50 text-white font-semibold rounded-lg shadow-xs"
                  >
                    {isExtracting ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Extracting Candidate Rules...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Extract Candidate Rules</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Review & Approve Extracted Rules */
            <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Candidate Rules Extracted</span>
                  </div>
                  <h3 className="text-base font-bold text-stone-900">
                    Review and Approve Extracted Rules
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Only rules explicitly approved by you will govern compliance audits.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setExtractionCompleted(false)}
                    className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-800"
                  >
                    Discard & Re-paste
                  </button>
                  <button
                    onClick={handleApproveAllCandidates}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Activate Approved Rules ({candidateRules.filter((r) => r.humanApprovalStatus === 'approved').length})</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {candidateRules.map((cRule, idx) => {
                  const isApproved = cRule.humanApprovalStatus === 'approved';
                  return (
                    <div
                      key={idx}
                      className={`border rounded-lg p-3.5 text-xs transition-colors ${
                        isApproved
                          ? 'border-stone-200 bg-white'
                          : 'border-stone-200/60 bg-stone-50/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-[11px] text-stone-500">
                            <span className="font-semibold text-stone-700 capitalize">
                              {cRule.category.replace(/_/g, ' ')}
                            </span>
                            <span>·</span>
                            <span className="font-mono text-stone-600 uppercase text-[10px]">
                              {cRule.severity}
                            </span>
                            <span>·</span>
                            <span>Section: {cRule.pageOrSection}</span>
                          </div>
                          <h4 className="font-semibold text-stone-900">{cRule.ruleDescription}</h4>
                          {cRule.detectionPattern && (
                            <div className="text-[11px] font-mono text-stone-600">
                              Pattern: "{cRule.detectionPattern}"
                            </div>
                          )}
                          <div className="text-[11px] text-stone-500 italic">
                            Excerpt: "{cRule.sourceExcerpt}"
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleCandidate(idx)}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                            isApproved
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                          }`}
                        >
                          {isApproved ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Approved</span>
                            </>
                          ) : (
                            <>
                              <X className="w-3 h-3" />
                              <span>Excluded</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SOURCE DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          {brandDocuments.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-xl p-8 text-center">
              <FileText className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-xs text-stone-500">No source documents uploaded for this brand yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {brandDocuments.map((doc) => (
                <div key={doc.id} className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-stone-900">{doc.title}</h4>
                      <div className="text-[11px] text-stone-400 mt-0.5">
                        {doc.fileName} · v{doc.version}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedDocPreview(doc)}
                      className="flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Read Text</span>
                    </button>
                  </div>
                  <div className="text-xs text-stone-500 line-clamp-3 bg-stone-50 p-2.5 rounded font-mono text-[11px]">
                    {doc.extractedText}
                  </div>
                  <div className="text-[11px] text-stone-400 pt-1">
                    Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Document Text Preview Modal */}
      {selectedDocPreview && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-stone-200 max-w-2xl w-full p-6 shadow-xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-900">{selectedDocPreview.title}</h3>
                <div className="text-[11px] text-stone-400">Source Text Preview</div>
              </div>
              <button
                onClick={() => setSelectedDocPreview(null)}
                className="text-stone-400 hover:text-stone-600 font-bold"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono text-stone-800 whitespace-pre-wrap leading-relaxed">
              {selectedDocPreview.extractedText}
            </div>
          </div>
        </div>
      )}

      {/* Manual Rule Creation Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-stone-200 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="text-base font-bold text-stone-900">Add Brand Rule Manually</h3>
              <button onClick={() => setShowManualModal(false)} className="text-stone-400 hover:text-stone-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManualRule} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Rule Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Do not claim 100% protection from all UV rays"
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Category</label>
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value as RuleCategory)}
                    className="w-full px-2 py-1.5 border border-stone-300 rounded-lg text-xs"
                  >
                    <option value="prohibited_claims">Prohibited Claims</option>
                    <option value="unsupported_factual_claims">Unsupported Claims</option>
                    <option value="required_disclaimers">Required Disclaimer</option>
                    <option value="brand_spelling_naming">Brand Naming</option>
                    <option value="preferred_terminology">Preferred Term</option>
                    <option value="color_rules">Color Rules</option>
                    <option value="logo_usage">Logo Usage</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Severity</label>
                  <select
                    value={manualSeverity}
                    onChange={(e) => setManualSeverity(e.target.value as SeverityLevel)}
                    className="w-full px-2 py-1.5 border border-stone-300 rounded-lg text-xs"
                  >
                    <option value="critical">Critical (Blocks)</option>
                    <option value="major">Major</option>
                    <option value="minor">Minor</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Rule Type</label>
                  <select
                    value={manualType}
                    onChange={(e) => setManualType(e.target.value as RuleType)}
                    className="w-full px-2 py-1.5 border border-stone-300 rounded-lg text-xs"
                  >
                    <option value="deterministic">Deterministic</option>
                    <option value="semantic">Semantic (AI)</option>
                    <option value="visual">Visual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Detection Pattern / Prohibited Phrase (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., 100% protection from all UV rays"
                  value={manualPattern}
                  onChange={(e) => setManualPattern(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg font-mono text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Authorized Correction / Alternative (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Broad-spectrum SPF 50+ barrier defense"
                  value={manualReplacement}
                  onChange={(e) => setManualReplacement(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Source Excerpt / Policy Evidence
                </label>
                <textarea
                  rows={2}
                  placeholder="Policy quote that substantiates this rule..."
                  value={manualExcerpt}
                  onChange={(e) => setManualExcerpt(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-3.5 py-2 text-stone-600 hover:text-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4338CA] hover:bg-[#3730A3] text-white font-semibold rounded-lg shadow-xs"
                >
                  Save & Activate Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
