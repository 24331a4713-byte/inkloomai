import React, { useState, useEffect } from 'react';
import { Navigation, NavPage } from './components/Navigation';
import { TopHeader } from './components/TopHeader';
import { OverviewView } from './components/OverviewView';
import { BrandsView } from './components/BrandsView';
import { GuidelinesView } from './components/GuidelinesView';
import { CampaignsView } from './components/CampaignsView';
import { ContentEditorView } from './components/ContentEditorView';
import { AuditResultsView } from './components/AuditResultsView';
import { ReviewApprovalsView } from './components/ReviewApprovalsView';
import { AuditHistoryView } from './components/AuditHistoryView';
import { SettingsView } from './components/SettingsView';
import { OnboardingModal } from './components/OnboardingModal';
import { ExportModal } from './components/ExportModal';
import { NewComplianceModal } from './components/NewComplianceModal';
import { ToastProvider, useToast } from './components/Toast';
import {
  Brand,
  Campaign,
  GuidelineDocument,
  BrandRule,
  AuditRun,
  DraftRevision,
  Finding,
  ApprovalRecord,
} from './types';

function MainApp() {
  const { success, warning, error } = useToast();
  const [activePage, setActivePage] = useState<NavPage>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [guidelines, setGuidelines] = useState<GuidelineDocument[]>([]);
  const [rules, setRules] = useState<BrandRule[]>([]);
  const [audits, setAudits] = useState<AuditRun[]>([]);
  const [latestAudit, setLatestAudit] = useState<AuditRun | null>(null);
  const [revisions, setRevisions] = useState<DraftRevision[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);

  const [isAuditing, setIsAuditing] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showNewComplianceModal, setShowNewComplianceModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initial Load from Persistent Backend
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      const [brandsRes, campRes, auditRes] = await Promise.all([
        fetch('/api/brands').then((r) => r.json()),
        fetch('/api/campaigns').then((r) => r.json()),
        fetch('/api/audits').then((r) => r.json()),
      ]);

      const loadedBrands: Brand[] = Array.isArray(brandsRes) ? brandsRes : [];
      setBrands(loadedBrands);

      const loadedCampaigns: Campaign[] = Array.isArray(campRes) ? campRes : [];
      setCampaigns(loadedCampaigns);

      const loadedAudits: AuditRun[] = Array.isArray(auditRes) ? auditRes : [];
      setAudits(loadedAudits);

      // Select initial brand (prefer saved brand or first brand)
      const savedBrandId = localStorage.getItem('inkloom_brand_id');
      const targetBrand =
        loadedBrands.find((b) => b.id === savedBrandId) || loadedBrands[0] || null;

      if (targetBrand) {
        await selectBrandAndLoadDetails(targetBrand, loadedCampaigns, loadedAudits);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectBrandAndLoadDetails = async (
    brand: Brand,
    allCamp: Campaign[] = campaigns,
    allAudits: AuditRun[] = audits
  ) => {
    setSelectedBrand(brand);
    localStorage.setItem('inkloom_brand_id', brand.id);

    try {
      const [docRes, ruleRes] = await Promise.all([
        fetch(`/api/guidelines?brandId=${brand.id}`).then((r) => r.json()),
        fetch(`/api/rules?brandId=${brand.id}`).then((r) => r.json()),
      ]);

      setGuidelines(Array.isArray(docRes) ? docRes : []);
      setRules(Array.isArray(ruleRes) ? ruleRes : []);

      // Select first campaign belonging to this brand if active campaign doesn't match
      const brandCamps = allCamp.filter((c) => c.brandId === brand.id);
      const camp = brandCamps[0] || null;
      setActiveCampaign(camp);

      if (camp) {
        await loadCampaignDetails(camp.id, allAudits);
      } else {
        setLatestAudit(null);
        setRevisions([]);
        setApprovals([]);
      }
    } catch (err) {
      console.error('Failed to load brand details:', err);
    }
  };

  const loadCampaignDetails = async (campaignId: string, allAudits: AuditRun[] = audits) => {
    try {
      const [campDetail, revs, apprRes] = await Promise.all([
        fetch(`/api/campaigns/${campaignId}`).then((r) => r.json()),
        fetch(`/api/campaigns/${campaignId}/revisions`).then((r) => r.json()),
        fetch(`/api/campaigns/${campaignId}/approvals`).then((r) => r.json()),
      ]);

      if (campDetail && !campDetail.error) {
        setActiveCampaign(campDetail);
      }
      setRevisions(Array.isArray(revs) ? revs : []);
      setApprovals(Array.isArray(apprRes) ? apprRes : []);

      const campAudits = allAudits.filter((a) => a.campaignId === campaignId);
      setLatestAudit(campAudits[0] || null);
    } catch (err) {
      console.error('Failed to load campaign details:', err);
    }
  };

  // Switch Brand
  const handleSelectBrand = (brand: Brand) => {
    selectBrandAndLoadDetails(brand);
    success('Brand Switched', `Active brand set to ${brand.name}.`);
  };

  // Create Brand
  const handleCreateBrand = async (brandData: Partial<Brand>) => {
    const res = await fetch('/api/brands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(brandData),
    });
    const created: Brand = await res.json();
    setBrands((prev) => [...prev, created]);
    selectBrandAndLoadDetails(created);
    success('Brand Created', `Created and activated ${created.name}.`);
  };

  // Reset Demo
  const handleResetDemo = async () => {
    await fetch('/api/brands/reset-demo', { method: 'POST' });
    await loadAllData();
    success('Demo Reset', 'Reset Solaria demo workspace to baseline.');
  };

  // Upload Guideline Document
  const handleUploadGuidelineDoc = async (data: {
    title: string;
    fileName: string;
    fileType: string;
    textContent: string;
  }) => {
    if (!selectedBrand) throw new Error('No brand selected');

    const res = await fetch('/api/guidelines/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brandId: selectedBrand.id,
        ...data,
      }),
    });
    const json = await res.json();
    if (json.document) {
      setGuidelines((prev) => [json.document, ...prev]);
      success('Guidelines Ingested', `Extracted ${json.candidateRules?.length || 0} candidate rules.`);
    }
    return json;
  };

  // Confirm Extracted Rules
  const handleConfirmRules = async (confirmedRules: BrandRule[]) => {
    await fetch('/api/guidelines/confirm-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules: confirmedRules }),
    });

    if (selectedBrand) {
      const updatedRules = await fetch(`/api/rules?brandId=${selectedBrand.id}`).then((r) => r.json());
      setRules(Array.isArray(updatedRules) ? updatedRules : []);
      success('Rules Activated', `Activated ${confirmedRules.length} rules.`);
    }
  };

  // Create Manual Rule
  const handleCreateManualRule = async (ruleData: Partial<BrandRule>) => {
    const res = await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ruleData),
    });
    const created = await res.json();
    setRules((prev) => [created, ...prev]);
    success('Rule Added', 'New rule added and activated.');
  };

  // Update Rule
  const handleUpdateRule = async (id: string, updates: Partial<BrandRule>) => {
    const res = await fetch(`/api/rules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const updated = await res.json();
    setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
  };

  // Delete Rule
  const handleDeleteRule = async (id: string) => {
    await fetch(`/api/rules/${id}`, { method: 'DELETE' });
    setRules((prev) => prev.filter((r) => r.id !== id));
    warning('Rule Deleted', 'Rule was removed from brand governance base.');
  };

  // Create Campaign
  const handleCreateCampaign = async (campData: Partial<Campaign>): Promise<Campaign> => {
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campData),
    });
    const created: Campaign = await res.json();
    setCampaigns((prev) => [created, ...prev]);
    setActiveCampaign(created);
    await loadCampaignDetails(created.id);
    success('Campaign Created', `Created campaign "${created.name}".`);
    return created;
  };

  // Save Draft
  const handleSaveDraft = async (content: string) => {
    if (!activeCampaign) return;
    const res = await fetch(`/api/campaigns/${activeCampaign.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentDraft: content }),
    });
    const updated: Campaign = await res.json();
    setActiveCampaign(updated);
    setCampaigns((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));

    // Refresh revisions
    const revs = await fetch(`/api/campaigns/${updated.id}/revisions`).then((r) => r.json());
    setRevisions(Array.isArray(revs) ? revs : []);
  };

  // Execute Compliance Audit
  const handleRunAudit = async (targetCampaignId?: string): Promise<void> => {
    const targetId = targetCampaignId || activeCampaign?.id;
    if (!targetId) return;
    setIsAuditing(true);

    try {
      const camp =
        campaigns.find((c) => c.id === targetId) ||
        (activeCampaign && activeCampaign.id === targetId ? activeCampaign : null);

      const res = await fetch('/api/audits/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: targetId,
          visualAssetMeta: camp?.visualAssetUrl
            ? {
                fileName: 'solaria_sunscreen_artwork.jpg',
                width: 1920,
                height: 1080,
                dominantColors: ['#F59E0B', '#E5E7EB'],
                hasLogo: true,
              }
            : undefined,
        }),
      });

      const auditRun: AuditRun = await res.json();
      setLatestAudit(auditRun);
      setAudits((prev) => [auditRun, ...prev]);

      if (camp) {
        const updatedCamp = {
          ...camp,
          lastAuditId: auditRun.id,
          lastAuditedVersion: auditRun.draftVersion,
          status: auditRun.releaseRecommendation.recommendedStatus,
        };
        setActiveCampaign(updatedCamp);
        setCampaigns((prev) => prev.map((c) => (c.id === updatedCamp.id ? updatedCamp : c)));
      }

      if (auditRun.aiRequestFailed) {
        warning(
          'Provisional Audit Completed',
          `Score: ${auditRun.scoreCalculation.complianceScore ?? 'N/A'}% (${auditRun.validatedFindings.length} violations found via local deterministic engine).`
        );
      } else {
        success(
          'Audit Completed',
          `Compliance Score: ${auditRun.scoreCalculation.complianceScore ?? 'N/A'}% (${auditRun.validatedFindings.length} violations found).`
        );
      }
      setActivePage('audit-results');
    } catch (err: any) {
      error('Audit Execution Error', err.message);
      throw err;
    } finally {
      setIsAuditing(false);
    }
  };

  // Apply Correction to Draft
  const handleApplyCorrection = async (finding: Finding, replacementText: string) => {
    if (!activeCampaign) return;

    let updatedDraft = activeCampaign.currentDraft;
    if (finding.quotedText && updatedDraft.includes(finding.quotedText)) {
      updatedDraft = updatedDraft.replace(finding.quotedText, replacementText);
    } else if (finding.ruleCategory === 'required_disclaimers') {
      updatedDraft = `${updatedDraft.trim()}\n\n${replacementText}`;
    }

    await handleSaveDraft(updatedDraft);

    if (latestAudit) {
      setLatestAudit({
        ...latestAudit,
        validatedFindings: latestAudit.validatedFindings.map((f) =>
          f.id === finding.id ? { ...f, resolutionStatus: 'accepted_correction', userCorrection: replacementText } : f
        ),
      });
    }
  };

  // Apply All Eligible Corrections
  const handleApplyAllCorrections = async (
    corrections: { finding: Finding; replacement: string }[]
  ) => {
    if (!activeCampaign) return;

    let updatedDraft = activeCampaign.currentDraft;
    for (const item of corrections) {
      if (item.finding.quotedText && updatedDraft.includes(item.finding.quotedText)) {
        updatedDraft = updatedDraft.replace(item.finding.quotedText, item.replacement);
      } else if (item.finding.ruleCategory === 'required_disclaimers') {
        updatedDraft = `${updatedDraft.trim()}\n\n${item.replacement}`;
      }
    }

    await handleSaveDraft(updatedDraft);

    if (latestAudit) {
      setLatestAudit({
        ...latestAudit,
        validatedFindings: latestAudit.validatedFindings.map((f) => {
          const match = corrections.find((c) => c.finding.id === f.id);
          return match
            ? { ...f, resolutionStatus: 'accepted_correction', userCorrection: match.replacement }
            : f;
        }),
      });
    }
  };

  // Dismiss Finding with reason
  const handleDismissFinding = async (findingId: string, reason: string) => {
    if (latestAudit) {
      await fetch(`/api/audits/${latestAudit.id}/finding-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          findingId,
          resolutionStatus: 'dismissed',
          dismissalReason: reason,
        }),
      });

      setLatestAudit({
        ...latestAudit,
        validatedFindings: latestAudit.validatedFindings.map((f) =>
          f.id === findingId ? { ...f, resolutionStatus: 'dismissed', dismissalReason: reason } : f
        ),
      });
    }
  };

  // Approve Campaign
  const handleApproveCampaign = async (data: {
    auditId: string;
    action: 'approved' | 'rejected' | 'released';
    reviewerName: string;
    reviewerRole: string;
    comments: string;
  }) => {
    if (!activeCampaign) return;

    const res = await fetch(`/api/campaigns/${activeCampaign.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Approval rejected by decision engine.');
    }

    if (json.campaign) {
      setActiveCampaign(json.campaign);
      setCampaigns((prev) => prev.map((c) => (c.id === json.campaign.id ? json.campaign : c)));
    }
    if (json.record) {
      setApprovals((prev) => [json.record, ...prev]);
    }
  };

  // Run Regression Tests
  const handleRunRegressionTests = async () => {
    const res = await fetch('/api/regression-tests');
    return res.json();
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#FBFBFA] space-y-3">
        <div className="w-8 h-8 rounded bg-[#4338CA] flex items-center justify-center text-white font-bold text-sm tracking-wider shadow-sm animate-pulse">
          IK
        </div>
        <div className="text-xs font-semibold text-stone-600">Initializing INKLOOM AI...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-[#FBFBFA] overflow-hidden select-none">
      {/* Sidebar Navigation */}
      <Navigation
        activePage={activePage}
        setActivePage={setActivePage}
        brands={brands}
        selectedBrand={selectedBrand}
        onSelectBrand={handleSelectBrand}
        onOpenOnboarding={() => setShowOnboarding(true)}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        {/* Top Header */}
        <TopHeader
          activePage={activePage}
          selectedBrand={selectedBrand}
          activeCampaign={activeCampaign}
          onRunAudit={handleRunAudit}
          onOpenNewCompliance={() => setShowNewComplianceModal(true)}
          isAuditing={isAuditing}
        />

        {/* View Router */}
        <main className="flex-1 overflow-y-auto">
          {activePage === 'overview' && (
            <OverviewView
              brand={selectedBrand}
              campaigns={campaigns}
              audits={audits}
              rules={rules}
              setActivePage={setActivePage}
              onSelectCampaign={(c) => {
                setActiveCampaign(c);
                loadCampaignDetails(c.id);
              }}
              onOpenNewCampaignModal={() => setActivePage('campaigns')}
              onRunAudit={handleRunAudit}
              onOpenNewCompliance={() => setShowNewComplianceModal(true)}
            />
          )}

          {activePage === 'brands' && (
            <BrandsView
              brands={brands}
              selectedBrand={selectedBrand}
              rules={rules}
              campaigns={campaigns}
              onSelectBrand={handleSelectBrand}
              onCreateBrand={handleCreateBrand}
              onResetDemo={handleResetDemo}
            />
          )}

          {activePage === 'guidelines' && (
            <GuidelinesView
              brand={selectedBrand}
              documents={guidelines}
              rules={rules}
              onUploadDocument={handleUploadGuidelineDoc}
              onConfirmRules={handleConfirmRules}
              onCreateManualRule={handleCreateManualRule}
              onUpdateRule={handleUpdateRule}
              onDeleteRule={handleDeleteRule}
            />
          )}

          {activePage === 'campaigns' && (
            <CampaignsView
              brand={selectedBrand}
              campaigns={campaigns}
              onSelectCampaign={(c) => {
                setActiveCampaign(c);
                loadCampaignDetails(c.id);
              }}
              onCreateCampaign={handleCreateCampaign}
              setActivePage={setActivePage}
              onOpenNewCompliance={() => setShowNewComplianceModal(true)}
            />
          )}

          {activePage === 'editor' && (
            <ContentEditorView
              campaign={activeCampaign}
              brand={selectedBrand}
              rules={rules}
              latestAudit={latestAudit}
              onSaveDraft={handleSaveDraft}
              onRunAudit={handleRunAudit}
              onApplyCorrection={handleApplyCorrection}
              onDismissFinding={handleDismissFinding}
              isAuditing={isAuditing}
              setActivePage={setActivePage}
              revisions={revisions}
            />
          )}

          {activePage === 'audit-results' && (
            <AuditResultsView
              audit={latestAudit}
              campaign={activeCampaign}
              brand={selectedBrand}
              onApplyCorrection={handleApplyCorrection}
              onApplyAllCorrections={handleApplyAllCorrections}
              onDismissFinding={handleDismissFinding}
              onRunAudit={handleRunAudit}
              setActivePage={setActivePage}
              onOpenExportModal={() => setShowExportModal(true)}
            />
          )}

          {activePage === 'review-approvals' && (
            <ReviewApprovalsView
              campaign={activeCampaign}
              brand={selectedBrand}
              latestAudit={latestAudit}
              approvals={approvals}
              onApproveCampaign={handleApproveCampaign}
              setActivePage={setActivePage}
            />
          )}

          {activePage === 'history' && (
            <AuditHistoryView
              audits={audits}
              campaigns={campaigns}
              brand={selectedBrand}
              onSelectAudit={(a) => {
                setLatestAudit(a);
                const camp = campaigns.find((c) => c.id === a.campaignId);
                if (camp) setActiveCampaign(camp);
              }}
              setActivePage={setActivePage}
            />
          )}

          {activePage === 'settings' && (
            <SettingsView onRunRegressionTests={handleRunRegressionTests} />
          )}
        </main>
      </div>

      {/* Guided Walkthrough Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        brand={selectedBrand}
        setActivePage={setActivePage}
        onRunAudit={handleRunAudit}
      />

      {/* Export Report Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        audit={latestAudit}
        campaign={activeCampaign}
        brand={selectedBrand}
      />

      {/* New Compliance Audit Wizard Modal */}
      <NewComplianceModal
        isOpen={showNewComplianceModal}
        onClose={() => setShowNewComplianceModal(false)}
        brands={brands}
        selectedBrand={selectedBrand}
        campaigns={campaigns}
        activeCampaign={activeCampaign}
        rules={rules}
        onSelectBrand={handleSelectBrand}
        onCreateBrand={handleCreateBrand}
        onCreateCampaign={handleCreateCampaign}
        onSaveDraft={handleSaveDraft}
        onExecuteAudit={async (cId) => {
          await handleRunAudit(cId);
        }}
        onCampaignActivated={(camp) => {
          setActiveCampaign(camp);
          loadCampaignDetails(camp.id);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}
