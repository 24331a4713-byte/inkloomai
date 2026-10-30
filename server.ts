/**
 * INKLOOM AI - Full-Stack Express Server
 * Serves backend compliance API endpoints and mounts Vite middlewares in dev mode.
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { db } from './src/server/storage';
import { runDeterministicAudit } from './src/engine/deterministicEngine';
import { runSemanticGeminiAudit } from './src/server/geminiAuditor';
import { validateAndDeduplicateFindings } from './src/engine/evidenceValidator';
import { calculateComplianceScore } from './src/engine/scoringEngine';
import { evaluateReleaseDecision } from './src/engine/releaseDecisionEngine';
import { runVisualComplianceAudit } from './src/engine/visualEngine';
import { runClaimRegistryAudit } from './src/engine/claimEngine';
import { extractRulesFromText } from './src/server/ruleExtractor';
import { runAllRegressionTests } from './src/engine/regressionTests';
import { AuditRun, Campaign, Finding, Claim } from './src/types';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Deduplication tracker to prevent rapid repeated submissions
const inFlightAudits = new Map<string, number>();

app.use(express.json({ limit: '15mb' }));

// --- API ROUTES ---

// Health & Environment Status
app.get('/api/health', (req, res) => {
  const hasGeminiKey = !!process.env.GEMINI_API_KEY;
  res.json({
    status: 'online',
    appName: 'INKLOOM AI',
    version: '1.0.0',
    geminiConfigured: hasGeminiKey,
    timestamp: new Date().toISOString(),
  });
});

// Brands
app.get('/api/brands', (req, res) => {
  res.json(db.getBrands());
});

app.get('/api/brands/:id', (req, res) => {
  const brand = db.getBrandById(req.params.id);
  if (!brand) return res.status(404).json({ error: 'Brand not found' });
  res.json(brand);
});

app.post('/api/brands', (req, res) => {
  const { name, industry, description, primaryLanguage, website, logoUrl, visualPalette } = req.body;
  if (!name) return res.status(400).json({ error: 'Brand name is required' });

  const newBrand = db.createBrand({
    id: `brand-${Date.now()}`,
    name,
    industry: industry || 'General',
    description: description || '',
    primaryLanguage: primaryLanguage || 'en',
    website: website || '',
    logoUrl: logoUrl || '',
    isDemo: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    approvalPolicy: {
      requireSignOffForMajor: true,
      requireSignOffForMinor: false,
      allowedReviewers: ['Compliance Lead', 'Brand Director'],
    },
    visualPalette: visualPalette || {
      primaryColor: '#3B49DF',
      secondaryColor: '#1E293B',
      prohibitedBackgrounds: ['#000000'],
      requiredLogoAspectRatios: ['16:9', '1:1'],
    },
  });
  res.status(201).json(newBrand);
});

app.put('/api/brands/:id', (req, res) => {
  const updated = db.updateBrand(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Brand not found' });
  res.json(updated);
});

app.delete('/api/brands/:id', (req, res) => {
  const deleted = db.deleteBrand(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Brand not found' });
  res.json({ success: true });
});

app.post('/api/brands/reset-demo', (req, res) => {
  db.resetDemoData();
  res.json({ success: true, message: 'Demo data re-initialized' });
});

// Guidelines & Rules
app.get('/api/guidelines', (req, res) => {
  const brandId = req.query.brandId as string;
  if (!brandId) return res.status(400).json({ error: 'brandId query parameter is required' });
  res.json(db.getDocumentsByBrand(brandId));
});

app.post('/api/guidelines/upload', async (req, res) => {
  try {
    const { brandId, title, fileName, fileType, textContent } = req.body;
    if (!brandId || !textContent) {
      return res.status(400).json({ error: 'brandId and textContent are required' });
    }

    const docId = `doc-${Date.now()}`;
    const docTitle = title || fileName || 'Brand Guidelines';

    // Extract candidate rules
    const candidateRules = await extractRulesFromText(textContent, docId, docTitle, brandId);

    const doc = db.createDocument({
      id: docId,
      brandId,
      title: docTitle,
      fileName: fileName || 'guidelines.txt',
      fileType: fileType || 'text/plain',
      version: 1,
      uploadedAt: new Date().toISOString(),
      extractedText: textContent,
      status: 'extracted',
      rulesCount: candidateRules.length,
    });

    res.json({ document: doc, candidateRules });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Guideline processing failed' });
  }
});

app.post('/api/guidelines/confirm-rules', (req, res) => {
  const { rules } = req.body;
  if (!Array.isArray(rules)) {
    return res.status(400).json({ error: 'rules array is required' });
  }

  const createdRules = rules.map((r) => db.createRule(r));
  res.json({ success: true, count: createdRules.length, rules: createdRules });
});

app.get('/api/rules', (req, res) => {
  const brandId = req.query.brandId as string;
  if (!brandId) return res.status(400).json({ error: 'brandId query parameter is required' });
  res.json(db.getRulesByBrand(brandId));
});

app.post('/api/rules', (req, res) => {
  const rule = req.body;
  if (!rule.brandId || !rule.ruleDescription) {
    return res.status(400).json({ error: 'brandId and ruleDescription are required' });
  }
  const created = db.createRule({
    ...rule,
    id: `rule-${Date.now()}`,
    createdAt: new Date().toISOString(),
  });
  res.status(201).json(created);
});

app.put('/api/rules/:id', (req, res) => {
  const updated = db.updateRule(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Rule not found' });
  res.json(updated);
});

app.delete('/api/rules/:id', (req, res) => {
  const deleted = db.deleteRule(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Rule not found' });
  res.json({ success: true });
});

// --- CLAIM REGISTRY API ---
app.get('/api/claims', (req, res) => {
  const brandId = req.query.brandId as string;
  if (brandId) {
    return res.json(db.getClaimsByBrand(brandId));
  }
  res.json(db.getAllClaims());
});

app.get('/api/claims/:id', (req, res) => {
  const claim = db.getClaimById(req.params.id);
  if (!claim) return res.status(404).json({ error: 'Claim not found' });
  res.json(claim);
});

app.post('/api/claims', (req, res) => {
  const { brandId, claimText, category, sourceEvidence, evidenceUrl, status, reviewerName, reviewerRole, expiryDate, tags, usageNotes } = req.body;
  if (!brandId || !claimText || !sourceEvidence || !expiryDate) {
    return res.status(400).json({ error: 'brandId, claimText, sourceEvidence, and expiryDate are required fields' });
  }

  const newClaim: Claim = {
    id: `claim-${Date.now()}`,
    brandId,
    claimText: claimText.trim(),
    category: category || 'general',
    sourceEvidence: sourceEvidence.trim(),
    evidenceUrl: evidenceUrl || '',
    status: status || 'pending_review',
    reviewerName: reviewerName || '',
    reviewerRole: reviewerRole || '',
    reviewedAt: status === 'approved' || status === 'rejected' ? new Date().toISOString() : undefined,
    expiryDate,
    tags: Array.isArray(tags) ? tags : [],
    usageNotes: usageNotes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const created = db.createClaim(newClaim);
  res.status(201).json(created);
});

app.put('/api/claims/:id', (req, res) => {
  const updated = db.updateClaim(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Claim not found' });
  res.json(updated);
});

app.delete('/api/claims/:id', (req, res) => {
  const deleted = db.deleteClaim(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Claim not found' });
  res.json({ success: true });
});

app.post('/api/claims/check', (req, res) => {
  const { draft, brandId } = req.body;
  if (!brandId) return res.status(400).json({ error: 'brandId is required' });
  const brand = db.getBrandById(brandId);
  if (!brand) return res.status(404).json({ error: 'Brand not found' });

  const brandClaims = db.getClaimsByBrand(brandId);
  const result = runClaimRegistryAudit(draft || '', brandClaims, brand);
  res.json(result);
});

// System Storage Status & Diagnostics
app.get('/api/system/storage-info', (req, res) => {
  res.json({
    appName: 'INKLOOM AI',
    status: 'operational',
    storage: db.getStorageStatus(),
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      platform: process.platform,
      hasGeminiApiKey: !!process.env.GEMINI_API_KEY,
    },
    deploymentGuidance: {
      isEphemeralVercel: process.env.VERCEL === '1',
      storageNotice: 'File-backed persistence operates safely on persistent disks (Docker, VM, Render, Fly.io, Cloud Run). For Vercel serverless functions, external DB adapter is recommended.',
    },
  });
});

// Campaigns
app.get('/api/campaigns', (req, res) => {
  const brandId = req.query.brandId as string;
  if (brandId) {
    return res.json(db.getCampaignsByBrand(brandId));
  }
  res.json(db.getAllCampaigns());
});

app.get('/api/campaigns/:id', (req, res) => {
  const camp = db.getCampaignById(req.params.id);
  if (!camp) return res.status(404).json({ error: 'Campaign not found' });
  const revisions = db.getRevisions(camp.id);
  res.json({ ...camp, revisions });
});

app.post('/api/campaigns', (req, res) => {
  const { brandId, name, contentType, targetAudience, language, currentDraft, visualAssetUrl, visualAssetFileName } = req.body;
  if (!brandId || !name) {
    return res.status(400).json({ error: 'brandId and name are required' });
  }

  const camp = db.createCampaign({
    id: `camp-${Date.now()}`,
    brandId,
    name,
    contentType: contentType || 'advertisements',
    targetAudience: targetAudience || 'General audience',
    language: language || 'en',
    currentDraft: currentDraft || '',
    draftVersion: 1,
    draftHash: `hash-${Date.now()}`,
    visualAssetUrl,
    visualAssetFileName,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  res.status(201).json(camp);
});

app.put('/api/campaigns/:id', (req, res) => {
  const updated = db.updateCampaign(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Campaign not found' });
  res.json(updated);
});

app.get('/api/campaigns/:id/revisions', (req, res) => {
  res.json(db.getRevisions(req.params.id));
});

// Core Compliance Audit Engine Runner
app.post('/api/audits/run', async (req, res) => {
  try {
    const { campaignId, visualAssetMeta } = req.body;
    if (!campaignId) return res.status(400).json({ error: 'campaignId is required' });

    // Deduplication check: prevent rapid repeated clicks within 1.5 seconds
    const lastRunTime = inFlightAudits.get(campaignId) || 0;
    if (Date.now() - lastRunTime < 1500) {
      return res.status(429).json({
        error: 'Audit is already in progress or was just submitted for this campaign. Please wait a moment.',
      });
    }
    inFlightAudits.set(campaignId, Date.now());

    const campaign = db.getCampaignById(campaignId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const brand = db.getBrandById(campaign.brandId);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });

    const draft = campaign.currentDraft || '';

    // Validation: Require non-empty draft copy or visual asset
    if (!draft.trim() && !visualAssetMeta && !campaign.visualAssetUrl) {
      return res.status(400).json({
        error: 'Draft content is empty. Please enter marketing copy or upload a visual asset before running an audit.',
      });
    }

    // Retrieve active approved rules belonging to the current brand (Strict Brand Isolation!)
    const allBrandRules = db.getRulesByBrand(brand.id);
    const activeRules = allBrandRules.filter(
      (r) => r.isActive && r.humanApprovalStatus === 'approved'
    );

    // Step A: Deterministic Checks
    const deterministicFindings = runDeterministicAudit(draft, activeRules, brand);

    // Step B: Claim Registry Checks (Validate Claims against active, expired, unapproved registry records)
    const brandClaims = db.getClaimsByBrand(brand.id);
    const claimAuditResult = runClaimRegistryAudit(draft, brandClaims, brand);
    const claimFindings = claimAuditResult.findings;

    // Step C: Semantic AI Checks (Gemini)
    let semanticFindings: Finding[] = [];
    let isAIRequestFailed = false;
    let aiFailureReason: string | undefined;

    if (activeRules.length > 0 && draft.trim().length > 0) {
      const geminiResult = await runSemanticGeminiAudit(draft, activeRules, brand.name);
      semanticFindings = geminiResult.findings;
      if (!geminiResult.success) {
        isAIRequestFailed = true;
        aiFailureReason = geminiResult.errorMessage;
      }
    }

    // Step D: Visual Checks (Real image analysis or metadata)
    let visualFindings: Finding[] = [];
    if (visualAssetMeta || campaign.visualAssetUrl) {
      const visualReport = runVisualComplianceAudit(
        visualAssetMeta || { fileName: campaign.visualAssetFileName },
        activeRules,
        brand
      );
      visualFindings = visualReport.visualFindings;
    }

    // Combine raw candidate findings from all engines
    const rawCandidateFindings = [
      ...deterministicFindings,
      ...claimFindings,
      ...semanticFindings,
      ...visualFindings,
    ];

    // Step D: Evidence Validation & Deduplication
    const { validatedFindings, quarantinedFindings } = validateAndDeduplicateFindings(
      rawCandidateFindings,
      draft,
      activeRules,
      brand
    );

    // Step E: Transparent Scoring Calculation
    const scoreCalculation = calculateComplianceScore(
      validatedFindings,
      activeRules,
      isAIRequestFailed,
      aiFailureReason
    );

    // Step F: Release Decision Engine
    const isAuditStale = false; // Freshly calculated on current draft
    const releaseRecommendation = evaluateReleaseDecision(
      campaign,
      brand,
      validatedFindings,
      quarantinedFindings,
      scoreCalculation,
      isAuditStale,
      isAIRequestFailed
    );

    const auditRun: AuditRun = {
      id: `audit-${Date.now()}`,
      brandId: brand.id,
      campaignId: campaign.id,
      draftVersion: campaign.draftVersion,
      draftHash: campaign.draftHash,
      activeGuidelineIds: db.getDocumentsByBrand(brand.id).map((d) => d.id),
      applicableRuleIds: activeRules.map((r) => r.id),
      timestamp: new Date().toISOString(),
      engineVersion: '2.4.0-hybrid',
      deterministicFindings,
      semanticFindings,
      visualFindings,
      validatedFindings,
      quarantinedFindings,
      scoreCalculation,
      releaseRecommendation,
      aiRequestFailed: isAIRequestFailed,
      aiFailureReason,
    };

    // Save persisted record
    db.saveAudit(auditRun);

    res.json(auditRun);
  } catch (err: any) {
    console.error('Audit execution error:', err);
    res.status(500).json({ error: err.message || 'Audit execution failed' });
  }
});

// Audits & History
app.get('/api/audits', (req, res) => {
  const campaignId = req.query.campaignId as string;
  if (campaignId) {
    return res.json(db.getAuditsByCampaign(campaignId));
  }
  res.json(db.getAllAudits());
});

app.get('/api/audits/:id', (req, res) => {
  const audit = db.getAuditById(req.params.id);
  if (!audit) return res.status(404).json({ error: 'Audit not found' });
  res.json(audit);
});

// Approvals & Formal Sign-off
app.post('/api/campaigns/:id/approve', (req, res) => {
  const { auditId, action, reviewerName, reviewerRole, comments } = req.body;
  if (!auditId || !action || !reviewerName) {
    return res.status(400).json({ error: 'auditId, action, and reviewerName are required' });
  }

  const campaign = db.getCampaignById(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  const audit = db.getAuditById(auditId);
  if (!audit) return res.status(404).json({ error: 'Audit run not found' });

  // Deduplication check: prevent duplicate submissions within 3 seconds
  const recentApprovals = db.getApprovalsByCampaign(campaign.id);
  const isDuplicate = recentApprovals.some(
    (a) => a.auditId === auditId && a.action === action && Date.now() - new Date(a.timestamp).getTime() < 3000
  );
  if (isDuplicate) {
    return res.status(429).json({
      error: 'Duplicate approval submission detected. This action was already recorded.',
    });
  }

  // Verification: Cannot approve if critical violations exist or if draft is stale!
  if (action === 'approved' || action === 'released') {
    if (campaign.draftVersion !== audit.draftVersion) {
      return res.status(400).json({
        error: 'Cannot approve stale audit. Draft was updated after this audit run. Please re-audit first.',
      });
    }

    const openCritical = audit.validatedFindings.some(
      (f) => f.severity === 'critical' && f.resolutionStatus === 'open'
    );
    if (openCritical) {
      return res.status(400).json({
        error: 'Action blocked: Campaign has unresolved critical compliance violations.',
      });
    }
  }

  const record = db.recordApproval({
    id: `appr-${Date.now()}`,
    campaignId: campaign.id,
    auditId,
    action,
    reviewerName,
    reviewerRole: reviewerRole || 'Compliance Reviewer',
    timestamp: new Date().toISOString(),
    comments: comments || '',
  });

  res.json({ success: true, record, campaign: db.getCampaignById(req.params.id) });
});

app.get('/api/campaigns/:id/approvals', (req, res) => {
  res.json(db.getApprovalsByCampaign(req.params.id));
});

// Live Assistant Contextual Q&A
app.post('/api/assistant/chat', async (req, res) => {
  try {
    const { brandId, draft, query, activeFindings, history } = req.body;
    const brand = brandId ? db.getBrandById(brandId) : null;
    const rules = brandId ? db.getRulesByBrand(brandId) : [];

    const { handleAssistantChat } = await import('./src/server/assistantChat');
    const response = await handleAssistantChat({
      brandName: brand?.name || 'Governing Brand',
      draft: draft || '',
      query: query || '',
      rules,
      activeFindings: activeFindings || [],
      history: history || [],
    });

    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Assistant request failed' });
  }
});

// Update Finding Resolution Status (e.g. dismiss with reason)
app.post('/api/audits/:id/finding-status', (req, res) => {
  const { findingId, resolutionStatus, dismissalReason, userCorrection } = req.body;
  const audit = db.getAuditById(req.params.id);
  if (!audit) return res.status(404).json({ error: 'Audit not found' });

  const finding = audit.validatedFindings.find((f) => f.id === findingId);
  if (finding) {
    finding.resolutionStatus = resolutionStatus;
    if (dismissalReason) finding.dismissalReason = dismissalReason;
    if (userCorrection) finding.userCorrection = userCorrection;
  }

  // Recalculate score & release recommendation
  const brand = db.getBrandById(audit.brandId);
  const campaign = db.getCampaignById(audit.campaignId);
  const activeRules = db.getRulesByBrand(audit.brandId).filter((r) => r.isActive && r.humanApprovalStatus === 'approved');

  audit.scoreCalculation = calculateComplianceScore(audit.validatedFindings, activeRules, audit.aiRequestFailed, audit.aiFailureReason);
  if (campaign && brand) {
    audit.releaseRecommendation = evaluateReleaseDecision(
      campaign,
      brand,
      audit.validatedFindings,
      audit.quarantinedFindings,
      audit.scoreCalculation,
      campaign.draftVersion !== audit.draftVersion,
      audit.aiRequestFailed
    );
  }

  db.saveAudit(audit);
  res.json({ success: true, audit });
});

// Automated Regression Test Suite Execution
app.get('/api/regression-tests', (req, res) => {
  const results = runAllRegressionTests();
  res.json(results);
});

// Mount Vite or serve static assets
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`INKLOOM AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
