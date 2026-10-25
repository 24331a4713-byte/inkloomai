import React, { useState } from 'react';
import { Building2, Plus, Check, RefreshCw, Palette, Shield } from 'lucide-react';
import { Brand, BrandRule, Campaign } from '../types';

interface BrandsViewProps {
  brands: Brand[];
  selectedBrand: Brand | null;
  rules: BrandRule[];
  campaigns: Campaign[];
  onSelectBrand: (brand: Brand) => void;
  onCreateBrand: (brand: Partial<Brand>) => Promise<void>;
  onResetDemo: () => Promise<void>;
}

export const BrandsView: React.FC<BrandsViewProps> = ({
  brands,
  selectedBrand,
  rules,
  campaigns,
  onSelectBrand,
  onCreateBrand,
  onResetDemo,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [primaryLanguage, setPrimaryLanguage] = useState('en');
  const [website, setWebsite] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#4338CA');
  const [prohibitedBg, setProhibitedBg] = useState('#000000');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreateBrand({
        name,
        industry,
        description,
        primaryLanguage,
        website,
        visualPalette: {
          primaryColor,
          secondaryColor: '#1E293B',
          prohibitedBackgrounds: prohibitedBg ? [prohibitedBg] : [],
          requiredLogoAspectRatios: ['16:9', '1:1'],
        },
        approvalPolicy: {
          requireSignOffForMajor: true,
          requireSignOffForMinor: false,
          allowedReviewers: ['Compliance Officer'],
        },
      });
      setShowCreateModal(false);
      setName('');
      setIndustry('');
      setDescription('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoReset = async () => {
    if (!confirm('Reset sample demo brand and campaigns to baseline state?')) return;
    setIsResetting(true);
    try {
      await onResetDemo();
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Brand Directory</h1>
          <p className="text-xs text-stone-500 mt-1 max-w-xl">
            Each brand maintains strictly isolated guidelines, campaigns, rules, and audit logs.
            Rules from one brand never leak into another.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDemoReset}
            disabled={isResetting}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-stone-500 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Reset Demo Workspace</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#4338CA] hover:bg-[#3730A3] rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Brand</span>
          </button>
        </div>
      </div>

      {/* Brand Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {brands.map((b) => {
          const isSelected = selectedBrand?.id === b.id;
          const brandRulesCount = rules.filter((r) => r.brandId === b.id).length;
          const brandCampaignsCount = campaigns.filter((c) => c.brandId === b.id).length;

          return (
            <div
              key={b.id}
              className={`bg-white border rounded-xl p-5 flex flex-col justify-between transition-all ${
                isSelected
                  ? 'border-indigo-600 ring-2 ring-indigo-600/10 shadow-xs'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm text-white shadow-xs"
                      style={{ backgroundColor: b.visualPalette?.primaryColor || '#4338CA' }}
                    >
                      {b.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-stone-900 leading-tight flex items-center gap-1.5">
                        {b.name}
                        {b.isDemo && (
                          <span className="text-[10px] font-normal px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded">
                            Demo
                          </span>
                        )}
                      </h2>
                      <div className="text-[11px] text-stone-400 mt-0.5">{b.industry}</div>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      <Check className="w-3 h-3" />
                      Active
                    </span>
                  )}
                </div>

                <p className="text-xs text-stone-600 mt-3 line-clamp-2">
                  {b.description || 'No description provided.'}
                </p>

                <div className="mt-4 pt-3 border-t border-stone-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-stone-400 block font-medium">Rules</span>
                    <span className="font-semibold text-stone-800 font-mono tabular-nums">{brandRulesCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-stone-400 block font-medium">Campaigns</span>
                    <span className="font-semibold text-stone-800 font-mono tabular-nums">{brandCampaignsCount}</span>
                  </div>
                </div>

                {b.visualPalette && (
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-stone-500">
                    <Palette className="w-3.5 h-3.5 text-stone-400" />
                    <span>Primary: </span>
                    <span
                      className="w-3 h-3 rounded-full border border-stone-300 inline-block"
                      style={{ backgroundColor: b.visualPalette.primaryColor }}
                    />
                    <span className="font-mono text-[10px]">{b.visualPalette.primaryColor}</span>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3">
                {!isSelected ? (
                  <button
                    onClick={() => onSelectBrand(b)}
                    className="w-full py-1.5 px-3 text-xs font-semibold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 rounded-lg transition-colors"
                  >
                    Set as Governing Brand
                  </button>
                ) : (
                  <div className="text-center text-[11px] font-medium text-stone-400 py-1.5">
                    Currently Governing Active Audits
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Brand Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-stone-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="text-base font-bold text-stone-900">Create New Brand</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-stone-400 hover:text-stone-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Brand Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Lumina Diagnostics"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Industry</label>
                <input
                  type="text"
                  placeholder="e.g., Biotechnology / SaaS / Retail"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Brand Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief overview of the brand's mission and compliance scope..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Primary Color (Hex)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-8 h-8 rounded border border-stone-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 border border-stone-300 rounded-lg font-mono text-[11px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Prohibited Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={prohibitedBg}
                      onChange={(e) => setProhibitedBg(e.target.value)}
                      className="w-8 h-8 rounded border border-stone-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={prohibitedBg}
                      onChange={(e) => setProhibitedBg(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 border border-stone-300 rounded-lg font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Website URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 text-stone-600 hover:text-stone-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="px-4 py-2 bg-[#4338CA] hover:bg-[#3730A3] disabled:opacity-50 text-white font-semibold rounded-lg shadow-xs"
                >
                  {isSubmitting ? 'Creating...' : 'Save Brand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
