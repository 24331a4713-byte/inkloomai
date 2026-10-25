import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Sparkles,
  Building2,
  Megaphone,
  BookOpenCheck,
  FileEdit,
  AlertCircle,
  Plus,
  CheckCircle2,
  ChevronDown,
  Layers,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Brand, Campaign, BrandRule, ContentScope, AuditRun } from '../types';
import { useToast } from './Toast';

interface NewComplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  brands: Brand[];
  selectedBrand: Brand | null;
  campaigns: Campaign[];
  activeCampaign: Campaign | null;
  rules: BrandRule[];
  onSelectBrand: (brand: Brand) => void;
  onCreateBrand: (brandData: Partial<Brand>) => Promise<void>;
  onCreateCampaign: (campData: Partial<Campaign>) => Promise<Campaign>;
  onSaveDraft: (content: string) => Promise<void>;
  onExecuteAudit: (campaignId: string) => Promise<void>;
  onCampaignActivated: (campaign: Campaign) => void;
}

const SAMPLE_COPY_PRESETS: Record<string, string> = {
  general: `Introducing the next frontier in daily performance from our core product line.
Our formula provides 100% protection from all everyday environmental stress and guaranteed permanent rejuvenation in two weeks.
Formulated with sustainably sourced ingredients and packaged responsibly. Apply generously 15 minutes before daily exposure.`,
  skincare: `Meet the next generation in skin defense from solaria.

Our dermatological daily mineral fluid delivers 100% protection from every harmful UV ray while outdoor adventures unfold. Formulated with non-nano zinc oxide and calming sea kelp, this lightweight shield guarantees permanent pigmentation removal within two weeks.

Trusted by outdoor athletes worldwide, our mineral fluid leaves no white cast and stays comfortable through humidity. Apply generously 15 minutes before sun exposure.`,
};

export const NewComplianceModal: React.FC<NewComplianceModalProps> = ({
  isOpen,
  onClose,
  brands,
  selectedBrand,
  campaigns,
  activeCampaign,
  rules,
  onSelectBrand,
  onCreateBrand,
  onCreateCampaign,
  onSaveDraft,
  onExecuteAudit,
  onCampaignActivated,
}) => {
  const { success, warning, error: toastError } = useToast();

  // Wizard Tab or Step State
  const [targetBrandId, setTargetBrandId] = useState<string>('');
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandIndustry, setNewBrandIndustry] = useState('');
  const [newBrandDescription, setNewBrandDescription] = useState('');

  // Campaign State
  const [campaignMode, setCampaignMode] = useState<'existing' | 'new'>('existing');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [newCampaignName, setNewCampaignName] = useState('');
  const [contentType, setContentType] = useState<ContentScope>('advertisements');
  const [targetAudience, setTargetAudience] = useState('');
  const [language, setLanguage] = useState('en');

  // Content Draft State
  const [draftContent, setDraftContent] = useState('');
  const [showRulesPreview, setShowRulesPreview] = useState(false);

  // Validation & Loading
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state when modal opens or brand changes
  useEffect(() => {
    if (isOpen) {
      const activeBId = selectedBrand?.id || (brands[0] ? brands[0].id : '');
      setTargetBrandId(activeBId);

      const brandCamps = campaigns.filter((c) => c.brandId === activeBId);
      if (brandCamps.length > 0) {
        setCampaignMode('existing');
        const defaultCamp = activeCampaign && activeCampaign.brandId === activeBId ? activeCampaign : brandCamps[0];
        setSelectedCampaignId(defaultCamp.id);
        setDraftContent(defaultCamp.currentDraft || '');
      } else {
        setCampaignMode('new');
        setNewCampaignName('Summer Launch Campaign 2026');
        setDraftContent(SAMPLE_COPY_PRESETS.skincare);
      }
      setValidationErrors([]);
    }
  }, [isOpen, selectedBrand, brands]);

  // When selected brand changes inside the modal
  const handleBrandChange = (bId: string) => {
    setTargetBrandId(bId);
    const targetB = brands.find((b) => b.id === bId);
    if (targetB) {
      onSelectBrand(targetB);
    }

    const brandCamps = campaigns.filter((c) => c.brandId === bId);
    if (brandCamps.length > 0) {
      setCampaignMode('existing');
      setSelectedCampaignId(brandCamps[0].id);
      setDraftContent(brandCamps[0].currentDraft || '');
    } else {
      setCampaignMode('new');
      setSelectedCampaignId('');
      setNewCampaignName('New Brand Campaign');
      setDraftContent(SAMPLE_COPY_PRESETS.general);
    }
  };

  // When selected existing campaign changes
  const handleCampaignChange = (cId: string) => {
    setSelectedCampaignId(cId);
    const camp = campaigns.find((c) => c.id === cId);
    if (camp) {
      setDraftContent(camp.currentDraft || '');
    }
  };

  const handleCreateNewBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) {
      setValidationErrors(['Brand name is required.']);
      return;
    }

    try {
      await onCreateBrand({
        name: newBrandName.trim(),
        industry: newBrandIndustry.trim() || 'General Commerce',
        description: newBrandDescription.trim(),
      });
      setIsCreatingBrand(false);
      setNewBrandName('');
      setNewBrandIndustry('');
      setNewBrandDescription('');
      success('Brand Created', 'New brand registered and selected for compliance.');
    } catch (err: any) {
      toastError('Brand Creation Failed', err.message);
    }
  };

  const handleLoadSampleCopy = () => {
    const targetBrand = brands.find((b) => b.id === targetBrandId);
    const isSolaria = targetBrand?.name.toLowerCase().includes('solaria');
    const sample = isSolaria ? SAMPLE_COPY_PRESETS.skincare : SAMPLE_COPY_PRESETS.general;
    setDraftContent(sample);
    success('Sample Copy Loaded', 'Inserted sample marketing content for evaluation.');
  };

  const validateInputs = (): boolean => {
    const errors: string[] = [];
    if (!targetBrandId) {
      errors.push('Please select or create a governing brand.');
    }

    if (campaignMode === 'new') {
      if (!newCampaignName.trim()) {
        errors.push('Campaign title is required.');
      }
    } else {
      if (!selectedCampaignId) {
        errors.push('Please select an existing campaign or switch to "Create New Campaign".');
      }
    }

    if (!draftContent.trim() || draftContent.trim().length < 10) {
      errors.push('Marketing content draft must be at least 10 characters long.');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleRunComplianceAudit = async () => {
    if (!validateInputs()) return;

    setIsSubmitting(true);
    try {
      let activeCamp: Campaign;

      if (campaignMode === 'new') {
        activeCamp = await onCreateCampaign({
          brandId: targetBrandId,
          name: newCampaignName.trim(),
          contentType,
          targetAudience: targetAudience.trim() || 'General Audience',
          language,
          currentDraft: draftContent.trim(),
        });
      } else {
        const found = campaigns.find((c) => c.id === selectedCampaignId);
        if (!found) throw new Error('Selected campaign could not be located.');

        activeCamp = found;
        if (draftContent !== found.currentDraft) {
          await onSaveDraft(draftContent);
          activeCamp.currentDraft = draftContent;
        }
      }

      onCampaignActivated(activeCamp);

      // Run actual audit engine against current draft and selected brand's approved guidelines
      await onExecuteAudit(activeCamp.id);

      onClose();
    } catch (err: any) {
      toastError('Compliance Audit Failed', err.message || 'Audit execution encountered an issue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentBrand = brands.find((b) => b.id === targetBrandId) || selectedBrand;
  const brandRules = rules.filter(
    (r) => r.brandId === targetBrandId && r.isActive && r.humanApprovalStatus === 'approved'
  );
  const brandCampaigns = campaigns.filter((c) => c.brandId === targetBrandId);
  const wordCount = draftContent.trim() ? draftContent.trim().split(/\s+/).length : 0;
  const charCount = draftContent.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white border border-stone-200 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#4338CA] flex items-center justify-center text-white shadow-xs">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 leading-none">
                Start a New Compliance Audit
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Evaluate marketing copy against approved brand guidelines and risk policies
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Validation Errors Notice */}
        {validationErrors.length > 0 && (
          <div className="px-6 pt-4 shrink-0">
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-semibold">Please fix the following before running audit:</div>
                <ul className="list-disc list-inside space-y-0.5">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Section 1: Governing Brand Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-700" />
                <span>1. Select Governing Brand</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingBrand(!isCreatingBrand)}
                className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>{isCreatingBrand ? 'Cancel' : 'Create New Brand'}</span>
              </button>
            </div>

            {isCreatingBrand ? (
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
                <div className="text-xs font-semibold text-stone-800">Register New Brand</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-stone-600 block mb-1">
                      Brand Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lumina Health"
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-stone-600 block mb-1">
                      Industry
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Wellness / Skincare"
                      value={newBrandIndustry}
                      onChange={(e) => setNewBrandIndustry(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-stone-600 block mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="Short description of brand mission"
                    value={newBrandDescription}
                    onChange={(e) => setNewBrandDescription(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCreateNewBrand}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors cursor-pointer"
                >
                  Save & Select Brand
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {brands.map((b) => {
                  const isSelected = b.id === targetBrandId;
                  const bRuleCount = rules.filter(
                    (r) => r.brandId === b.id && r.isActive && r.humanApprovalStatus === 'approved'
                  ).length;
                  return (
                    <div
                      key={b.id}
                      onClick={() => handleBrandChange(b.id)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start justify-between gap-2 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-2xs'
                          : 'border-stone-200 hover:border-stone-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-xs text-stone-900">
                          <span>{b.name}</span>
                          {b.isDemo && (
                            <span className="text-[10px] font-medium px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded">
                              Demo
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">{b.industry}</div>
                        <div className="text-[10px] text-indigo-700 font-medium mt-1">
                          {bRuleCount} approved rules active
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-stone-300'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Campaign Selection & Metadata */}
          <div className="space-y-3 pt-4 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5 text-indigo-700" />
                <span>2. Campaign & Content Scope</span>
              </label>

              <div className="flex items-center bg-stone-100 p-0.5 rounded-lg text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setCampaignMode('existing')}
                  disabled={brandCampaigns.length === 0}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    campaignMode === 'existing'
                      ? 'bg-white text-stone-900 shadow-2xs'
                      : 'text-stone-500 hover:text-stone-800 disabled:opacity-40'
                  }`}
                >
                  Existing Campaign ({brandCampaigns.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCampaignMode('new')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    campaignMode === 'new'
                      ? 'bg-white text-stone-900 shadow-2xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  + New Campaign
                </button>
              </div>
            </div>

            {campaignMode === 'existing' && brandCampaigns.length > 0 ? (
              <div>
                <label className="text-[11px] font-medium text-stone-600 block mb-1">
                  Choose Campaign
                </label>
                <div className="relative">
                  <select
                    value={selectedCampaignId}
                    onChange={(e) => handleCampaignChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 appearance-none pr-8 cursor-pointer"
                  >
                    {brandCampaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · v{c.draftVersion} ({c.contentType.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-medium text-stone-600 block mb-1">
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Fall Skincare Launch 2026"
                    value={newCampaignName}
                    onChange={(e) => setNewCampaignName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-stone-600 block mb-1">
                    Content Channel / Scope
                  </label>
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value as ContentScope)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 cursor-pointer"
                  >
                    <option value="advertisements">Advertisements (Paid Search/Social)</option>
                    <option value="product_descriptions">Product Descriptions</option>
                    <option value="social_media">Social Media Posts</option>
                    <option value="website_copy">Website / Landing Pages</option>
                    <option value="email_campaigns">Email Campaigns</option>
                    <option value="blog_content">Blog & Editorial Content</option>
                    <option value="marketing_scripts">Video / Audio Scripts</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-stone-600 block mb-1">
                    Target Audience
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Health-conscious shoppers"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Approved Guidelines Preview */}
          <div className="space-y-2 pt-4 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpenCheck className="w-3.5 h-3.5 text-indigo-700" />
                <span>3. Governing Brand Guidelines ({brandRules.length} Approved Rules)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowRulesPreview(!showRulesPreview)}
                className="text-[11px] text-indigo-700 hover:text-indigo-900 font-semibold"
              >
                {showRulesPreview ? 'Hide Rules' : 'Preview Rules'}
              </button>
            </div>

            {brandRules.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                Warning: No approved guidelines exist for {currentBrand?.name || 'this brand'}. Audits
                will require brand rules before calculating compliance penalties.
              </div>
            ) : showRulesPreview ? (
              <div className="max-h-36 overflow-y-auto space-y-1.5 p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs">
                {brandRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-start justify-between gap-2 p-1.5 bg-white border border-stone-100 rounded-lg text-[11px]"
                  >
                    <div>
                      <span className="font-semibold text-stone-800">{rule.ruleDescription}</span>
                      <div className="text-[10px] text-stone-400 capitalize">
                        {rule.category.replace(/_/g, ' ')} · {rule.severity} severity
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-medium shrink-0">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-stone-500 bg-stone-50 px-3 py-2 rounded-lg border border-stone-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  The compliance engine will strictly check against {brandRules.length} active rules
                  belonging to <strong className="text-stone-800">{currentBrand?.name}</strong>.
                </span>
              </div>
            )}
          </div>

          {/* Section 4: Marketing Copy Content Editor */}
          <div className="space-y-2 pt-4 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileEdit className="w-3.5 h-3.5 text-indigo-700" />
                <span>4. Marketing Content Draft *</span>
              </label>

              <button
                type="button"
                onClick={handleLoadSampleCopy}
                className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Insert Sample Copy</span>
              </button>
            </div>

            <div className="relative">
              <textarea
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                placeholder="Write or paste your marketing content here to evaluate against approved guidelines..."
                rows={6}
                className="w-full p-3.5 text-xs font-mono leading-relaxed bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 transition-all placeholder:font-sans placeholder:text-stone-400"
              />
              <div className="flex items-center justify-between text-[10px] text-stone-400 px-1 pt-1 font-mono">
                <span>Directly editable · Supports instant copy/paste</span>
                <span>
                  {wordCount} words · {charCount} chars
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleRunComplianceAudit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#4338CA] hover:bg-[#3730A3] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/15 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Running Compliance Audit...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run Compliance Audit</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
