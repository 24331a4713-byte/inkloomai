import React, { useState, useMemo } from 'react';
import {
  FileCheck2,
  Plus,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Edit2,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  FlaskConical,
  Check,
  X,
  FileText,
} from 'lucide-react';
import { Claim, ClaimStatus, Brand } from '../types';
import { useToast } from './Toast';

interface ClaimRegistryViewProps {
  brand: Brand | null;
  claims: Claim[];
  onCreateClaim: (claim: Partial<Claim>) => Promise<Claim | null>;
  onUpdateClaim: (id: string, updates: Partial<Claim>) => Promise<Claim | null>;
  onDeleteClaim: (id: string) => Promise<boolean>;
  onTestDraft: (draft: string) => Promise<any>;
}

export const ClaimRegistryView: React.FC<ClaimRegistryViewProps> = ({
  brand,
  claims,
  onCreateClaim,
  onUpdateClaim,
  onDeleteClaim,
  onTestDraft,
}) => {
  const { success, warning, error } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClaim, setEditingClaim] = useState<Claim | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    claimText: '',
    category: 'clinical' as Claim['category'],
    sourceEvidence: '',
    evidenceUrl: '',
    status: 'approved' as ClaimStatus,
    reviewerName: '',
    reviewerRole: '',
    expiryDate: '',
    tags: '',
    usageNotes: '',
  });

  // Interactive Sandbox Check State
  const [sandboxDraft, setSandboxDraft] = useState('');
  const [sandboxResult, setSandboxResult] = useState<any>(null);
  const [isCheckingSandbox, setIsCheckingSandbox] = useState(false);

  const now = new Date();

  // Filtered Claims
  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      // Search
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        claim.claimText.toLowerCase().includes(q) ||
        claim.sourceEvidence.toLowerCase().includes(q) ||
        (claim.reviewerName && claim.reviewerName.toLowerCase().includes(q)) ||
        claim.tags.some((t) => t.toLowerCase().includes(q));

      // Status
      let matchesStatus = true;
      const isExpired = claim.expiryDate && new Date(claim.expiryDate) < now;
      if (selectedStatus === 'approved') {
        matchesStatus = claim.status === 'approved' && !isExpired;
      } else if (selectedStatus === 'expired') {
        matchesStatus = claim.status === 'expired' || !!isExpired;
      } else if (selectedStatus === 'pending_review') {
        matchesStatus = claim.status === 'pending_review';
      } else if (selectedStatus === 'rejected') {
        matchesStatus = claim.status === 'rejected';
      }

      // Category
      const matchesCat = selectedCategory === 'all' || claim.category === selectedCategory;

      return matchesSearch && matchesStatus && matchesCat;
    });
  }, [claims, searchQuery, selectedStatus, selectedCategory]);

  const handleOpenCreateModal = () => {
    setEditingClaim(null);
    // Default expiry 1 year in the future
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const defaultDate = nextYear.toISOString().split('T')[0];

    setFormData({
      claimText: '',
      category: 'clinical',
      sourceEvidence: '',
      evidenceUrl: '',
      status: 'approved',
      reviewerName: brand?.approvalPolicy.allowedReviewers[0] || 'Medical Review Board',
      reviewerRole: 'Lead Compliance Reviewer',
      expiryDate: defaultDate,
      tags: '',
      usageNotes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c: Claim) => {
    setEditingClaim(c);
    setFormData({
      claimText: c.claimText,
      category: c.category,
      sourceEvidence: c.sourceEvidence,
      evidenceUrl: c.evidenceUrl || '',
      status: c.status,
      reviewerName: c.reviewerName || '',
      reviewerRole: c.reviewerRole || '',
      expiryDate: c.expiryDate.split('T')[0],
      tags: c.tags.join(', '),
      usageNotes: c.usageNotes || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmitModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand) return;

    if (!formData.claimText.trim() || !formData.sourceEvidence.trim() || !formData.expiryDate) {
      error('Missing Information', 'Claim statement, evidence dossier, and expiry date are required.');
      return;
    }

    const payload = {
      brandId: brand.id,
      claimText: formData.claimText.trim(),
      category: formData.category,
      sourceEvidence: formData.sourceEvidence.trim(),
      evidenceUrl: formData.evidenceUrl.trim(),
      status: formData.status,
      reviewerName: formData.reviewerName.trim(),
      reviewerRole: formData.reviewerRole.trim(),
      expiryDate: formData.expiryDate,
      tags: formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      usageNotes: formData.usageNotes.trim(),
    };

    try {
      if (editingClaim) {
        await onUpdateClaim(editingClaim.id, payload);
        success('Claim Updated', `Updated claim: "${payload.claimText.slice(0, 30)}..."`);
      } else {
        await onCreateClaim(payload);
        success('Claim Registered', `Added new substantiated claim to ${brand.name} registry.`);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      error('Failed to save claim', err.message);
    }
  };

  const handleDelete = async (id: string, text: string) => {
    if (!window.confirm(`Are you sure you want to remove claim "${text.slice(0, 40)}..."?`)) {
      return;
    }
    try {
      await onDeleteClaim(id);
      success('Claim Deleted', 'Removed record from Claim Registry.');
    } catch (err: any) {
      error('Delete Failed', err.message);
    }
  };

  const handleRunSandboxCheck = async () => {
    if (!sandboxDraft.trim()) {
      warning('Empty Draft', 'Please enter marketing text to test against claims.');
      return;
    }
    setIsCheckingSandbox(true);
    try {
      const res = await onTestDraft(sandboxDraft);
      setSandboxResult(res);
      if (res.findings && res.findings.length > 0) {
        warning(
          'Issues Detected',
          `Found ${res.findings.length} claim violation(s) or unsupported statement(s).`
        );
      } else {
        success('Claims Substantiated', 'All recognized claims verified against active registry.');
      }
    } catch (err: any) {
      error('Check Failed', err.message);
    } finally {
      setIsCheckingSandbox(false);
    }
  };

  if (!brand) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-3">
        <h2 className="text-base font-semibold text-stone-800">No brand selected</h2>
        <p className="text-xs text-stone-500">Please select an active brand to view its Claim Registry.</p>
      </div>
    );
  }

  // Statistics
  const totalClaims = claims.length;
  const approvedClaims = claims.filter(
    (c) => c.status === 'approved' && (!c.expiryDate || new Date(c.expiryDate) >= now)
  ).length;
  const expiredClaims = claims.filter(
    (c) => c.status === 'expired' || (c.expiryDate && new Date(c.expiryDate) < now)
  ).length;
  const pendingClaims = claims.filter((c) => c.status === 'pending_review').length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 uppercase tracking-wider">
            <span>{brand.name}</span>
            <span>·</span>
            <span>Legal & Clinical Governance</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight mt-1">
            Claim Registry & Substantiation
          </h1>
          <p className="text-xs text-stone-500 mt-1 max-w-2xl leading-relaxed">
            Centralized database of scientifically validated and legally authorized marketing claims.
            Every claim is tied to clinical trial dossiers, expiration tracking, and authorized sign-off.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#4338CA] hover:bg-[#3730A3] text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Substantiated Claim</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>Total Claims</span>
            <FileCheck2 className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-stone-900 mt-2">{totalClaims}</p>
          <span className="text-[11px] text-stone-400 mt-1 block">Registered in brand library</span>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>Approved & Active</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{approvedClaims}</p>
          <span className="text-[11px] text-stone-400 mt-1 block">Valid for campaign publication</span>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>Expired / Outdated</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-700 mt-2">{expiredClaims}</p>
          <span className="text-[11px] text-red-500 mt-1 block">Requires recertification</span>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>Pending Review</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-700 mt-2">{pendingClaims}</p>
          <span className="text-[11px] text-stone-400 mt-1 block">Awaiting medical sign-off</span>
        </div>
      </div>

      {/* Main Content Layout: Claims List (Left) + Test Sandbox (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CLAIMS DIRECTORY (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="bg-white border border-stone-200 rounded-xl p-3 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search claims, clinical evidence, tags, or reviewers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-stone-50/50"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-2.5 py-1.5 border border-stone-200 rounded-lg bg-white text-stone-700 text-xs focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved & Active</option>
                <option value="pending_review">Pending Review</option>
                <option value="expired">Expired</option>
                <option value="rejected">Rejected</option>
              </select>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-2.5 py-1.5 border border-stone-200 rounded-lg bg-white text-stone-700 text-xs focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="clinical">Clinical</option>
                <option value="efficacy">Efficacy</option>
                <option value="ingredient">Ingredient</option>
                <option value="safety">Safety</option>
                <option value="environmental">Environmental</option>
              </select>
            </div>
          </div>

          {/* Claims Cards */}
          {filteredClaims.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-xl p-12 text-center space-y-3">
              <FlaskConical className="w-8 h-8 text-stone-300 mx-auto" />
              <h3 className="text-sm font-semibold text-stone-800">No claims found</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                No claims match your search or filter. Add a new claim to register clinical dossiers.
              </p>
              <button
                onClick={handleOpenCreateModal}
                className="px-3.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100"
              >
                Add Claim
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredClaims.map((claim) => {
                const isExpired = claim.expiryDate && new Date(claim.expiryDate) < now;
                const expiryDateObj = new Date(claim.expiryDate);
                const daysDiff = Math.ceil((expiryDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                let badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                let statusLabel = 'Approved';
                let StatusIcon = CheckCircle2;

                if (isExpired || claim.status === 'expired') {
                  badgeColor = 'bg-red-50 text-red-800 border-red-200';
                  statusLabel = `Expired (${Math.abs(daysDiff)}d ago)`;
                  StatusIcon = AlertTriangle;
                } else if (claim.status === 'rejected') {
                  badgeColor = 'bg-stone-100 text-stone-800 border-stone-300';
                  statusLabel = 'Rejected';
                  StatusIcon = XCircle;
                } else if (claim.status === 'pending_review') {
                  badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
                  statusLabel = 'Pending Review';
                  StatusIcon = Clock;
                }

                return (
                  <div
                    key={claim.id}
                    className={`bg-white border rounded-xl p-5 shadow-2xs space-y-3 transition-all hover:border-indigo-200 ${
                      isExpired ? 'border-red-200 bg-red-50/10' : 'border-stone-200'
                    }`}
                  >
                    {/* Top Row: Category, Status, Actions */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                          {claim.category}
                        </span>
                        <div
                          className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${badgeColor}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          <span>{statusLabel}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(claim)}
                          className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors"
                          title="Edit Claim"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(claim.id, claim.claimText)}
                          className="p-1.5 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete Claim"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Claim Statement */}
                    <div>
                      <h3 className="text-sm font-bold text-stone-900 leading-snug">
                        "{claim.claimText}"
                      </h3>
                    </div>

                    {/* Evidence & Regulatory Source */}
                    <div className="bg-stone-50 border border-stone-200/70 rounded-lg p-3 text-xs space-y-1">
                      <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider block">
                        Substantiating Evidence & Studies:
                      </span>
                      <p className="text-stone-700 leading-relaxed font-mono text-[11px]">
                        {claim.sourceEvidence}
                      </p>
                      {claim.evidenceUrl && (
                        <a
                          href={claim.evidenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-indigo-600 hover:underline inline-flex items-center gap-1 mt-1 font-medium"
                        >
                          <span>View Evidence Document</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {/* Bottom Metadata: Expiry, Reviewer, Tags */}
                    <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-[11px] text-stone-500">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          <span>
                            Valid Until:{' '}
                            <strong className="text-stone-800 font-medium">
                              {new Date(claim.expiryDate).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </strong>
                          </span>
                        </span>

                        {claim.reviewerName && (
                          <span>
                            Reviewer:{' '}
                            <strong className="text-stone-800 font-medium">{claim.reviewerName}</strong>
                            {claim.reviewerRole ? ` (${claim.reviewerRole})` : ''}
                          </span>
                        )}
                      </div>

                      {claim.tags && claim.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          {claim.tags.map((t, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 text-[10px]"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* INTERACTIVE CLAIMS TEST SANDBOX (4 Cols) */}
        <div className="lg:col-span-4 bg-white border border-stone-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Draft Claim Inspector</span>
            </div>
            <h3 className="text-sm font-bold text-stone-900 mt-1">
              Verify Copy Against Claims
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Test draft sentences instantly against the registry to check for expired, pending, or unsubstantiated claims.
            </p>
          </div>

          <div className="space-y-2">
            <textarea
              rows={4}
              placeholder="Paste sentence or draft excerpt here (e.g., 'Broad-spectrum SPF 50+ barrier defense delivers 24-hour hydration...')"
              value={sandboxDraft}
              onChange={(e) => setSandboxDraft(e.target.value)}
              className="w-full p-3 border border-stone-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-stone-50/50"
            />
            <button
              onClick={handleRunSandboxCheck}
              disabled={isCheckingSandbox || !sandboxDraft.trim()}
              className="w-full flex items-center justify-center gap-2 py-2 bg-[#4338CA] hover:bg-[#3730A3] disabled:opacity-40 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              {isCheckingSandbox ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Checking Claims...</span>
                </>
              ) : (
                <>
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>Check Against Registry</span>
                </>
              )}
            </button>
          </div>

          {/* Sandbox Results Display */}
          {sandboxResult && (
            <div className="border-t border-stone-100 pt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-stone-700">Audit Outcome:</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded font-bold ${
                    sandboxResult.findings.length === 0
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {sandboxResult.findings.length === 0 ? 'Compliant' : `${sandboxResult.findings.length} Issue(s)`}
                </span>
              </div>

              {/* Verified Claims */}
              {sandboxResult.verifiedClaims && sandboxResult.verifiedClaims.length > 0 && (
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-emerald-900 block">
                    Substantiated Claims ({sandboxResult.verifiedClaims.length}):
                  </span>
                  {sandboxResult.verifiedClaims.map((vc: any, idx: number) => (
                    <div key={idx} className="text-[11px] text-emerald-950 flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>"{vc.matchedText}"</strong>
                        <span className="text-[10px] text-emerald-700 block">
                          Valid until {vc.expiryDate} ({vc.daysRemaining} days left)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Detected Violations */}
              {sandboxResult.findings && sandboxResult.findings.length > 0 && (
                <div className="space-y-2">
                  {sandboxResult.findings.map((f: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border text-xs space-y-1 ${
                        f.severity === 'critical'
                          ? 'bg-red-50/90 border-red-200 text-red-950'
                          : 'bg-amber-50/90 border-amber-200 text-amber-950'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {f.ruleDescription}
                        </span>
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/70">
                          {f.severity}
                        </span>
                      </div>
                      <p className="font-mono text-[11px]">"{f.quotedText}"</p>
                      <p className="text-[11px] text-stone-600 leading-snug">{f.explanation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CREATE / EDIT CLAIM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  {editingClaim ? 'Edit Substantiated Claim' : 'Register New Marketing Claim'}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Governing brand: <strong>{brand.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitModal} className="space-y-4 text-xs">
              {/* Claim Statement */}
              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Claim Statement <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g., Broad-spectrum SPF 50+ barrier defense against UVA and UVB rays"
                  value={formData.claimText}
                  onChange={(e) => setFormData({ ...formData, claimText: e.target.value })}
                  className="w-full p-2.5 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              {/* Category & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs bg-white"
                  >
                    <option value="clinical">Clinical Efficacy</option>
                    <option value="efficacy">Performance & Wear</option>
                    <option value="ingredient">Active Ingredients</option>
                    <option value="safety">Dermatological Safety</option>
                    <option value="environmental">Environmental / Reef Safe</option>
                    <option value="comparative">Comparative Claim</option>
                    <option value="general">General Marketing</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Approval Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs bg-white"
                  >
                    <option value="approved">Approved & Active</option>
                    <option value="pending_review">Pending Clinical Sign-off</option>
                    <option value="expired">Expired (Needs Recertification)</option>
                    <option value="rejected">Rejected (Prohibited)</option>
                  </select>
                </div>
              </div>

              {/* Substantiating Evidence Dossier */}
              <div>
                <label className="font-semibold text-stone-700 block mb-1">
                  Substantiating Clinical / Legal Evidence <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g., In-Vitro Photoprotection Study #SOL-2025-08; FDA 21 CFR 352 Compliance Dossier..."
                  value={formData.sourceEvidence}
                  onChange={(e) => setFormData({ ...formData, sourceEvidence: e.target.value })}
                  className="w-full p-2.5 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              {/* Evidence URL */}
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Evidence Document URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://solaria-dermacare.example.com/clinical/sol-2025-08.pdf"
                  value={formData.evidenceUrl}
                  onChange={(e) => setFormData({ ...formData, evidenceUrl: e.target.value })}
                  className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                />
              </div>

              {/* Expiry Date & Reviewer Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">
                    Expiration / Recertification Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Authorized Reviewer</label>
                  <input
                    type="text"
                    placeholder="e.g., Dr. Elena Vance"
                    value={formData.reviewerName}
                    onChange={(e) => setFormData({ ...formData, reviewerName: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Reviewer Role & Tags */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Reviewer Role</label>
                  <input
                    type="text"
                    placeholder="e.g., Lead Dermatologist"
                    value={formData.reviewerRole}
                    onChange={(e) => setFormData({ ...formData, reviewerRole: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Tags (Comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g., SPF 50+, UVA, UVB, waterproof"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Usage / Governance Notes */}
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Usage & Governance Constraints</label>
                <input
                  type="text"
                  placeholder="e.g., Mandatory pairing with 15-minute disclaimer; packaging only"
                  value={formData.usageNotes}
                  onChange={(e) => setFormData({ ...formData, usageNotes: e.target.value })}
                  className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-stone-600 hover:text-stone-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4338CA] hover:bg-[#3730A3] text-white rounded-lg font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  {editingClaim ? 'Save Changes' : 'Register Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
