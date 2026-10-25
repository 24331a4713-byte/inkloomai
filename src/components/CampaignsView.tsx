import React, { useState } from 'react';
import { Megaphone, Plus, Search, FileEdit, ShieldCheck, Clock, Play } from 'lucide-react';
import { Brand, Campaign, ContentScope } from '../types';
import { NavPage } from './Navigation';

interface CampaignsViewProps {
  brand: Brand | null;
  campaigns: Campaign[];
  onSelectCampaign: (campaign: Campaign) => void;
  onCreateCampaign: (campaign: Partial<Campaign>) => Promise<Campaign>;
  setActivePage: (page: NavPage) => void;
  onOpenNewCompliance?: () => void;
}

export const CampaignsView: React.FC<CampaignsViewProps> = ({
  brand,
  campaigns,
  onSelectCampaign,
  onCreateCampaign,
  setActivePage,
  onOpenNewCompliance,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [contentType, setContentType] = useState<ContentScope>('advertisements');
  const [targetAudience, setTargetAudience] = useState('');
  const [language, setLanguage] = useState('en');
  const [initialDraft, setInitialDraft] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!brand) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-base font-semibold text-stone-800">No brand selected</h2>
        <p className="text-xs text-stone-500 mt-1">Select a brand to manage marketing campaigns.</p>
      </div>
    );
  }

  const brandCampaigns = campaigns.filter((c) => c.brandId === brand.id);
  const filtered = brandCampaigns.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contentType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await onCreateCampaign({
        brandId: brand.id,
        name: name.trim(),
        contentType,
        targetAudience: targetAudience.trim() || 'General Audience',
        language,
        currentDraft: initialDraft.trim(),
      });
      setShowCreateModal(false);
      setName('');
      setTargetAudience('');
      setInitialDraft('');
      onSelectCampaign(created);
      setActivePage('editor');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-1">
            Marketing Initiatives · {brand.name}
          </div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Campaigns</h1>
          <p className="text-xs text-stone-500 mt-1 max-w-2xl">
            Each campaign draft undergoes compliance verification before approval and release.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {onOpenNewCompliance && (
            <button
              onClick={onOpenNewCompliance}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#4338CA] hover:bg-[#3730A3] rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start a New Compliance</span>
            </button>
          )}

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Campaign</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search campaigns by title or channel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
        </div>
        <div className="text-xs text-stone-400 font-mono tabular-nums">
          {filtered.length} Campaign{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((camp) => {
          return (
            <div
              key={camp.id}
              className="bg-white border border-stone-200 rounded-xl p-5 hover:border-stone-300 transition-all shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                    {camp.contentType.replace('_', ' ')}
                  </span>
                  <span
                    className={`inline-flex items-center text-[11px] font-semibold capitalize ${
                      camp.status === 'approved' || camp.status === 'released'
                        ? 'text-emerald-700'
                        : camp.status === 'changes_required'
                        ? 'text-red-700'
                        : camp.status === 'needs_human_review'
                        ? 'text-amber-700'
                        : camp.status === 'ready_for_approval'
                        ? 'text-blue-700'
                        : 'text-stone-500'
                    }`}
                  >
                    {camp.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-stone-900 mt-2 leading-snug">
                  {camp.name}
                </h3>
                <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                  Target: {camp.targetAudience}
                </p>

                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
                  <span className="font-mono">Draft v{camp.draftVersion}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(camp.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-stone-100 flex items-center gap-2">
                <button
                  onClick={() => {
                    onSelectCampaign(camp);
                    setActivePage('editor');
                  }}
                  className="flex-1 py-1.5 px-3 text-xs font-semibold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>Open Editor</span>
                </button>
                {camp.lastAuditId && (
                  <button
                    onClick={() => {
                      onSelectCampaign(camp);
                      setActivePage('audit-results');
                    }}
                    className="py-1.5 px-3 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-stone-500" />
                    <span>Audit</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-stone-200 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="text-base font-bold text-stone-900">Create New Campaign</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-stone-400 hover:text-stone-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Campaign Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Q3 High-Protection SPF Campaign"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Content Type / Scope</label>
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value as ContentScope)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
                  >
                    <option value="advertisements">Advertisements</option>
                    <option value="social_media">Social Media</option>
                    <option value="product_descriptions">Product Descriptions</option>
                    <option value="website_copy">Website Copy</option>
                    <option value="email_campaigns">Email Campaigns</option>
                    <option value="landing_pages">Landing Pages</option>
                    <option value="blog_content">Blog Content</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
                  >
                    <option value="en">English (US)</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Target Audience</label>
                <input
                  type="text"
                  placeholder="e.g., Parents, dermatologists, athletes..."
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Initial Draft Content</label>
                <textarea
                  rows={4}
                  placeholder="Paste or draft marketing copy..."
                  value={initialDraft}
                  onChange={(e) => setInitialDraft(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 text-stone-600 hover:text-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="px-4 py-2 bg-[#4338CA] hover:bg-[#3730A3] disabled:opacity-50 text-white font-semibold rounded-lg shadow-xs"
                >
                  {isSubmitting ? 'Creating...' : 'Create & Open Editor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
