/**
 * INKLOOM AI - Persistent Storage Engine
 * File-backed JSON database providing persistence across page reloads and server restarts.
 * Handles strict brand isolation and seeds the illustrative Demo Sunscreen brand.
 */

import fs from 'fs';
import path from 'path';
import {
  Brand,
  GuidelineDocument,
  BrandRule,
  Campaign,
  DraftRevision,
  AuditRun,
  ApprovalRecord,
  Claim,
} from '../types';

interface DatabaseSchema {
  brands: Brand[];
  documents: GuidelineDocument[];
  rules: BrandRule[];
  campaigns: Campaign[];
  revisions: DraftRevision[];
  audits: AuditRun[];
  approvals: ApprovalRecord[];
  claims: Claim[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'inkloom-db.json');

export class Database {
  private data: DatabaseSchema;
  private isReadOnlyFallback: boolean = false;

  constructor() {
    this.data = this.loadData();
  }

  public getStorageStatus() {
    return {
      type: 'json_file_storage',
      path: DB_PATH,
      isReadOnlyFallback: this.isReadOnlyFallback,
      brandsCount: this.data.brands.length,
      claimsCount: this.data.claims?.length || 0,
      auditsCount: this.data.audits.length,
      campaignsCount: this.data.campaigns.length,
      rulesCount: this.data.rules.length,
    };
  }

  private loadData(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        try {
          fs.mkdirSync(DATA_DIR, { recursive: true });
        } catch (mkErr) {
          console.warn('[Storage] Read-only directory environment, memory mode active:', mkErr);
          this.isReadOnlyFallback = true;
        }
      }

      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        const parsed: DatabaseSchema = JSON.parse(raw);
        // Seamless migration: ensure claims array exists
        if (!Array.isArray(parsed.claims) || parsed.claims.length === 0) {
          const demoClaims = this.getSeedClaims();
          parsed.claims = demoClaims;
          this.saveData(parsed);
        }
        return parsed;
      }
    } catch (err) {
      console.error('Error reading database file, initializing fresh:', err);
    }

    const initial = this.getSeedData();
    this.saveData(initial);
    return initial;
  }

  private saveData(data: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
      this.isReadOnlyFallback = false;
    } catch (err: any) {
      console.warn('[Storage] Warning: File system write failed (likely serverless ephemeral/read-only environment). Continuing in-memory:', err?.message || err);
      this.isReadOnlyFallback = true;
    }
  }

  private persist() {
    this.saveData(this.data);
  }

  // --- SEED CLAIMS REGISTRY (Demo Sunscreen Brand) ---
  public getSeedClaims(): Claim[] {
    const brandId = 'brand-solaria-demo';
    return [
      {
        id: 'claim-sol-1',
        brandId,
        claimText: 'Broad-spectrum SPF 50+ barrier defense against UVA and UVB rays',
        category: 'clinical',
        sourceEvidence: 'Clinical In-Vitro Photoprotection Study #SOL-2025-08; FDA 21 CFR 352 Compliance Dossier.',
        evidenceUrl: 'https://solaria-dermacare.example.com/clinical/sol-2025-08.pdf',
        status: 'approved',
        reviewerName: 'Dr. Elena Vance',
        reviewerRole: 'Lead Dermatologist',
        reviewedAt: '2026-01-15T10:00:00.000Z',
        expiryDate: '2027-12-31',
        tags: ['SPF 50+', 'broad-spectrum', 'clinical', 'UVB'],
        usageNotes: 'Approved for digital ads, packaging, and social media with mandatory 15-minute disclaimer.',
        createdAt: '2026-01-15T10:00:00.000Z',
        updatedAt: '2026-01-15T10:00:00.000Z',
      },
      {
        id: 'claim-sol-2',
        brandId,
        claimText: 'Water-resistant up to 80 minutes',
        category: 'efficacy',
        sourceEvidence: 'Independent Laboratory Immersion Assay ISO 24444 (Report #WT-80-2025).',
        status: 'approved',
        reviewerName: 'Marcus Chen',
        reviewerRole: 'Compliance Officer',
        reviewedAt: '2026-02-10T14:30:00.000Z',
        expiryDate: '2027-08-30',
        tags: ['water-resistance', 'active-wear'],
        usageNotes: 'Must always be paired with reapplication advisory: "reapply after 80 minutes of swimming or sweating".',
        createdAt: '2026-02-10T14:30:00.000Z',
        updatedAt: '2026-02-10T14:30:00.000Z',
      },
      {
        id: 'claim-sol-3',
        brandId,
        claimText: 'All-day 24-hour hydration lock without reapplication',
        category: 'efficacy',
        sourceEvidence: 'Internal Pilot Moisture Sensor Test 2024 (Expired Certificate).',
        status: 'expired',
        reviewerName: 'Marcus Chen',
        reviewerRole: 'Compliance Officer',
        reviewedAt: '2024-06-01T09:00:00.000Z',
        expiryDate: '2025-06-01',
        tags: ['hydration', 'expired-claim'],
        usageNotes: 'EXPIRED: Do not use in active campaigns. Requires new 2026 corneometry trial before reactivation.',
        createdAt: '2024-06-01T09:00:00.000Z',
        updatedAt: '2025-06-02T00:00:00.000Z',
      },
      {
        id: 'claim-sol-4',
        brandId,
        claimText: 'Permanently erases hyperpigmentation and sun damage',
        category: 'clinical',
        sourceEvidence: 'Unverified testimonial submissions without randomized double-blind clinical validation.',
        status: 'rejected',
        reviewerName: 'Dr. Elena Vance',
        reviewerRole: 'Lead Dermatologist',
        reviewedAt: '2026-03-01T11:20:00.000Z',
        expiryDate: '2026-12-31',
        tags: ['pigmentation', 'rejected'],
        usageNotes: 'STRICTLY PROHIBITED: Misleading medical promise. Only gradual cosmetic fading may be claimed.',
        createdAt: '2026-03-01T11:20:00.000Z',
        updatedAt: '2026-03-01T11:20:00.000Z',
      },
      {
        id: 'claim-sol-5',
        brandId,
        claimText: 'Micro-algae photolyase enzyme speeds natural cellular DNA repair by 40%',
        category: 'ingredient',
        sourceEvidence: 'Phase II In-Vitro Cellular Repair Assay pending final peer review sign-off.',
        status: 'pending_review',
        reviewerName: 'Pending Medical Board',
        reviewerRole: 'Clinical Advisory Panel',
        expiryDate: '2027-01-01',
        tags: ['enzymes', 'pending', 'cellular-repair'],
        usageNotes: 'Under review. Not authorized for consumer-facing release until final peer review.',
        createdAt: '2026-10-10T16:00:00.000Z',
        updatedAt: '2026-10-10T16:00:00.000Z',
      },
    ];
  }

  // --- SEED DATA (Demo Sunscreen Brand) ---
  private getSeedData(): DatabaseSchema {
    const brandId = 'brand-solaria-demo';
    const docId = 'doc-solaria-guide-1';
    const campaignId = 'camp-solaria-summer-2026';

    const demoBrand: Brand = {
      id: brandId,
      name: 'Solaria Dermacare',
      industry: 'Dermatological Skincare',
      description: 'Medical-grade mineral sun defense formulated with board-certified dermatologists. (Illustrative Demo Data)',
      primaryLanguage: 'en',
      website: 'https://solaria-dermacare.example.com',
      logoUrl: '',
      isDemo: true,
      createdAt: '2026-10-01T09:00:00.000Z',
      updatedAt: '2026-10-24T10:00:00.000Z',
      approvalPolicy: {
        requireSignOffForMajor: true,
        requireSignOffForMinor: false,
        allowedReviewers: ['Dr. Elena Vance (Lead Dermatologist)', 'Marcus Chen (Compliance Officer)'],
      },
      visualPalette: {
        primaryColor: '#F59E0B',
        secondaryColor: '#0F172A',
        prohibitedBackgrounds: ['#000000', '#FF0000'],
        requiredLogoAspectRatios: ['16:9', '1:1', '4:3'],
      },
    };

    const docText = `# SOLARIA DERMACARE - BRAND COMPLIANCE & CLAIMS GOVERNANCE (2026)
[Notice: These are illustrative product-testing rules, not real legal advice or actual regulatory standards]

## Section 1: UV Protection & Sun Safety Claims
Rule 1.1: Do not claim "100% protection from every harmful UV ray". No sun protection formula provides 100% ray blockage. Approved alternative: "Broad-spectrum SPF 50+ barrier defense against UVA and UVB rays".
Rule 1.2: Do not claim that the product "prevents skin cancer" unless explicitly supported by FDA monographs and authorized clinical trial references. Approved phrasing: "Regular use helps reduce the risk of sun-induced skin aging when paired with protective clothing".
Rule 1.3: Do not claim "all-day protection without reapplication" or "waterproof". Approved wording: "Water-resistant up to 80 minutes; reapply every 2 hours".

## Section 2: Dermatological & Pigmentation Claims
Rule 2.1: Do not claim "permanent pigmentation removal" or "erases sun damage forever". Clinical evidence supports dark spot fading, not permanent genetic eradication.
Rule 2.2: Mandatory disclaimer required on all packaging and public digital ads: "Apply generously 15 minutes before sun exposure."

## Section 3: Brand Identity & Naming
Rule 3.1: The brand name must always be capitalized as "Solaria Dermacare" or "Solaria". Do not use lowercase "solaria" or alternate spellings like "Solaris".
Rule 3.2: Campaign artwork must never use pure pitch-black (#000000) or pure red (#FF0000) as background colors.
`;

    const demoDoc: GuidelineDocument = {
      id: docId,
      brandId,
      title: 'Solaria Brand Governance Guidelines v1.4',
      fileName: 'solaria_brand_governance_2026.md',
      fileType: 'text/markdown',
      version: 1,
      uploadedAt: '2026-10-02T14:30:00.000Z',
      extractedText: docText,
      status: 'active',
      rulesCount: 6,
    };

    const demoRules: BrandRule[] = [
      {
        id: 'rule-sol-100uv',
        brandId,
        sourceDocId: docId,
        sourceDocTitle: demoDoc.title,
        sourceDocVersion: 1,
        sourceExcerpt: 'Rule 1.1: Do not claim "100% protection from every harmful UV ray". No sun protection formula provides 100% ray blockage.',
        pageOrSection: 'Section 1.1',
        category: 'prohibited_claims',
        ruleDescription: 'Do not claim 100% protection from every harmful UV ray',
        ruleType: 'deterministic',
        severity: 'critical',
        scope: 'all',
        detectionPattern: '100% protection from every harmful UV ray',
        caseSensitive: false,
        targetReplacement: 'Broad-spectrum SPF 50+ barrier defense against UVA and UVB rays',
        isActive: true,
        humanApprovalStatus: 'approved',
        createdAt: '2026-10-02T14:35:00.000Z',
      },
      {
        id: 'rule-sol-cancer',
        brandId,
        sourceDocId: docId,
        sourceDocTitle: demoDoc.title,
        sourceDocVersion: 1,
        sourceExcerpt: 'Rule 1.2: Do not claim that the product "prevents skin cancer" unless explicitly supported by FDA monographs and authorized clinical trial references.',
        pageOrSection: 'Section 1.2',
        category: 'unsupported_factual_claims',
        ruleDescription: 'Do not claim the product prevents skin cancer without qualified authorization',
        ruleType: 'semantic',
        severity: 'critical',
        scope: 'all',
        detectionPattern: 'prevents skin cancer',
        caseSensitive: false,
        targetReplacement: 'helps reduce the risk of sun-induced skin aging when used as directed with other sun protection measures',
        isActive: true,
        humanApprovalStatus: 'approved',
        createdAt: '2026-10-02T14:35:00.000Z',
      },
      {
        id: 'rule-sol-pigment',
        brandId,
        sourceDocId: docId,
        sourceDocTitle: demoDoc.title,
        sourceDocVersion: 1,
        sourceExcerpt: 'Rule 2.1: Do not claim "permanent pigmentation removal" or "erases sun damage forever". Clinical evidence supports dark spot fading, not permanent genetic eradication.',
        pageOrSection: 'Section 2.1',
        category: 'unsupported_factual_claims',
        ruleDescription: 'Do not claim permanent pigmentation removal or permanent erasure of sun damage',
        ruleType: 'deterministic',
        severity: 'major',
        scope: 'all',
        detectionPattern: 'permanent pigmentation removal',
        caseSensitive: false,
        targetReplacement: 'visibly diminishes the appearance of sun-induced dark spots over 8 weeks',
        isActive: true,
        humanApprovalStatus: 'approved',
        createdAt: '2026-10-02T14:35:00.000Z',
      },
      {
        id: 'rule-sol-disclaimer',
        brandId,
        sourceDocId: docId,
        sourceDocTitle: demoDoc.title,
        sourceDocVersion: 1,
        sourceExcerpt: 'Rule 2.2: Mandatory disclaimer required on all packaging and public digital ads: "Apply generously 15 minutes before sun exposure."',
        pageOrSection: 'Section 2.2',
        category: 'required_disclaimers',
        ruleDescription: 'Mandatory disclaimer: Apply generously 15 minutes before sun exposure',
        ruleType: 'deterministic',
        severity: 'major',
        scope: 'all',
        detectionPattern: 'Apply generously 15 minutes before sun exposure',
        caseSensitive: false,
        targetReplacement: 'Apply generously 15 minutes before sun exposure.',
        isActive: true,
        humanApprovalStatus: 'approved',
        createdAt: '2026-10-02T14:35:00.000Z',
      },
      {
        id: 'rule-sol-naming',
        brandId,
        sourceDocId: docId,
        sourceDocTitle: demoDoc.title,
        sourceDocVersion: 1,
        sourceExcerpt: 'Rule 3.1: The brand name must always be capitalized as "Solaria Dermacare" or "Solaria". Do not use lowercase "solaria" or alternate spellings like "Solaris".',
        pageOrSection: 'Section 3.1',
        category: 'brand_spelling_naming',
        ruleDescription: 'Enforce correct capitalization of "Solaria Dermacare" or "Solaria"',
        ruleType: 'deterministic',
        severity: 'minor',
        scope: 'all',
        detectionPattern: 'Solaria',
        caseSensitive: true,
        targetReplacement: 'Solaria',
        isActive: true,
        humanApprovalStatus: 'approved',
        createdAt: '2026-10-02T14:35:00.000Z',
      },
      {
        id: 'rule-sol-bgcolor',
        brandId,
        sourceDocId: docId,
        sourceDocTitle: demoDoc.title,
        sourceDocVersion: 1,
        sourceExcerpt: 'Rule 3.2: Campaign artwork must never use pure pitch-black (#000000) or pure red (#FF0000) as background colors.',
        pageOrSection: 'Section 3.2',
        category: 'color_rules',
        ruleDescription: 'Prohibit pitch-black and pure red background colors in artwork',
        ruleType: 'visual',
        severity: 'major',
        scope: 'all',
        detectionPattern: '#000000',
        isActive: true,
        humanApprovalStatus: 'approved',
        createdAt: '2026-10-02T14:35:00.000Z',
      },
    ];

    // Mixed draft containing compliant copy alongside noncompliant claims
    const demoDraftText = `Meet the next generation in skin defense from solaria.

Our dermatological daily mineral fluid delivers 100% protection from every harmful UV ray while outdoor adventures unfold. Formulated with non-nano zinc oxide and calming sea kelp, this lightweight shield guarantees permanent pigmentation removal within two weeks.

Trusted by outdoor athletes worldwide, our mineral fluid leaves no white cast and stays comfortable through humidity. Apply generously 15 minutes before sun exposure.`;

    const demoCampaign: Campaign = {
      id: campaignId,
      brandId,
      name: 'Summer Sun Protection Launch 2026',
      contentType: 'product_descriptions',
      targetAudience: 'Health-conscious outdoor enthusiasts and skincare shoppers',
      language: 'en',
      currentDraft: demoDraftText,
      draftVersion: 1,
      draftHash: 'hash-demo-v1',
      status: 'draft',
      createdAt: '2026-10-15T11:00:00.000Z',
      updatedAt: '2026-10-15T11:00:00.000Z',
    };

    const demoRevision: DraftRevision = {
      id: 'rev-demo-v1',
      campaignId,
      version: 1,
      content: demoDraftText,
      changeSummary: 'Initial draft import from marketing copywriter',
      createdAt: '2026-10-15T11:00:00.000Z',
    };

    return {
      brands: [demoBrand],
      documents: [demoDoc],
      rules: demoRules,
      campaigns: [demoCampaign],
      revisions: [demoRevision],
      audits: [],
      approvals: [],
      claims: this.getSeedClaims(),
    };
  }

  // --- BRAND OPERATIONS ---
  public getBrands(): Brand[] {
    return this.data.brands;
  }

  public getBrandById(id: string): Brand | undefined {
    return this.data.brands.find((b) => b.id === id);
  }

  public createBrand(brand: Brand): Brand {
    this.data.brands.push(brand);
    this.persist();
    return brand;
  }

  public updateBrand(id: string, updates: Partial<Brand>): Brand | undefined {
    const idx = this.data.brands.findIndex((b) => b.id === id);
    if (idx === -1) return undefined;
    this.data.brands[idx] = { ...this.data.brands[idx], ...updates, updatedAt: new Date().toISOString() };
    this.persist();
    return this.data.brands[idx];
  }

  public deleteBrand(id: string): boolean {
    const before = this.data.brands.length;
    this.data.brands = this.data.brands.filter((b) => b.id !== id);
    // Cascade delete associated brand artifacts for strict isolation
    this.data.documents = this.data.documents.filter((d) => d.brandId !== id);
    this.data.rules = this.data.rules.filter((r) => r.brandId !== id);
    this.data.campaigns = this.data.campaigns.filter((c) => c.brandId !== id);
    this.data.audits = this.data.audits.filter((a) => a.brandId !== id);
    this.data.claims = (this.data.claims || []).filter((c) => c.brandId !== id);
    this.persist();
    return this.data.brands.length < before;
  }

  // --- GUIDELINES & RULES OPERATIONS (STRICT BRAND ISOLATION) ---
  public getDocumentsByBrand(brandId: string): GuidelineDocument[] {
    return this.data.documents.filter((d) => d.brandId === brandId);
  }

  public getDocumentById(id: string): GuidelineDocument | undefined {
    return this.data.documents.find((d) => d.id === id);
  }

  public createDocument(doc: GuidelineDocument): GuidelineDocument {
    this.data.documents.push(doc);
    this.persist();
    return doc;
  }

  public updateDocument(id: string, updates: Partial<GuidelineDocument>): GuidelineDocument | undefined {
    const idx = this.data.documents.findIndex((d) => d.id === id);
    if (idx === -1) return undefined;
    this.data.documents[idx] = { ...this.data.documents[idx], ...updates };
    this.persist();
    return this.data.documents[idx];
  }

  public getRulesByBrand(brandId: string): BrandRule[] {
    return this.data.rules.filter((r) => r.brandId === brandId);
  }

  public getRuleById(id: string): BrandRule | undefined {
    return this.data.rules.find((r) => r.id === id);
  }

  public createRule(rule: BrandRule): BrandRule {
    this.data.rules.push(rule);
    this.persist();
    return rule;
  }

  public updateRule(id: string, updates: Partial<BrandRule>): BrandRule | undefined {
    const idx = this.data.rules.findIndex((r) => r.id === id);
    if (idx === -1) return undefined;
    this.data.rules[idx] = { ...this.data.rules[idx], ...updates };
    this.persist();
    return this.data.rules[idx];
  }

  public deleteRule(id: string): boolean {
    const len = this.data.rules.length;
    this.data.rules = this.data.rules.filter((r) => r.id !== id);
    this.persist();
    return this.data.rules.length < len;
  }

  // --- CAMPAIGNS & REVISIONS ---
  public getCampaignsByBrand(brandId: string): Campaign[] {
    return this.data.campaigns.filter((c) => c.brandId === brandId);
  }

  public getAllCampaigns(): Campaign[] {
    return this.data.campaigns;
  }

  public getCampaignById(id: string): Campaign | undefined {
    return this.data.campaigns.find((c) => c.id === id);
  }

  public createCampaign(campaign: Campaign): Campaign {
    this.data.campaigns.push(campaign);
    // Automatically record version 1 revision
    this.data.revisions.push({
      id: `rev-${campaign.id}-v1`,
      campaignId: campaign.id,
      version: 1,
      content: campaign.currentDraft,
      changeSummary: 'Initial draft creation',
      createdAt: new Date().toISOString(),
    });
    this.persist();
    return campaign;
  }

  public updateCampaign(id: string, updates: Partial<Campaign>): Campaign | undefined {
    const idx = this.data.campaigns.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;

    const oldCampaign = this.data.campaigns[idx];
    const newDraft = updates.currentDraft !== undefined ? updates.currentDraft : oldCampaign.currentDraft;

    // Check if draft content changed
    if (updates.currentDraft !== undefined && updates.currentDraft !== oldCampaign.currentDraft) {
      const newVersion = (oldCampaign.draftVersion || 1) + 1;
      updates.draftVersion = newVersion;
      updates.draftHash = `hash-${Date.now()}`;
      // Invalidate status if content changed after audit
      if (oldCampaign.status === 'ready_for_approval' || oldCampaign.status === 'approved') {
        updates.status = 'changes_required';
      }

      this.data.revisions.push({
        id: `rev-${id}-v${newVersion}`,
        campaignId: id,
        version: newVersion,
        content: newDraft,
        changeSummary: 'Updated draft content in editor',
        createdAt: new Date().toISOString(),
      });
    }

    this.data.campaigns[idx] = {
      ...this.data.campaigns[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.data.campaigns[idx];
  }

  public getRevisions(campaignId: string): DraftRevision[] {
    return this.data.revisions.filter((r) => r.campaignId === campaignId).sort((a, b) => b.version - a.version);
  }

  // --- AUDITS & APPROVALS ---
  public getAuditsByCampaign(campaignId: string): AuditRun[] {
    return this.data.audits
      .filter((a) => a.campaignId === campaignId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public getAllAudits(): AuditRun[] {
    return this.data.audits.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public getAuditById(id: string): AuditRun | undefined {
    return this.data.audits.find((a) => a.id === id);
  }

  public saveAudit(audit: AuditRun): AuditRun {
    this.data.audits.unshift(audit);

    // Update campaign's last audit reference
    const camp = this.data.campaigns.find((c) => c.id === audit.campaignId);
    if (camp) {
      camp.lastAuditId = audit.id;
      camp.lastAuditedVersion = audit.draftVersion;
      camp.status = audit.releaseRecommendation.recommendedStatus;
      camp.updatedAt = new Date().toISOString();
    }

    this.persist();
    return audit;
  }

  public recordApproval(record: ApprovalRecord): ApprovalRecord {
    this.data.approvals.unshift(record);
    const camp = this.data.campaigns.find((c) => c.id === record.campaignId);
    if (camp) {
      if (record.action === 'approved') {
        camp.status = 'approved';
      } else if (record.action === 'rejected') {
        camp.status = 'rejected';
      } else if (record.action === 'released') {
        camp.status = 'released';
      }
      camp.updatedAt = new Date().toISOString();
    }
    this.persist();
    return record;
  }

  public getApprovalsByCampaign(campaignId: string): ApprovalRecord[] {
    return this.data.approvals.filter((a) => a.campaignId === campaignId);
  }

  // --- CLAIM REGISTRY OPERATIONS (STRICT BRAND ISOLATION) ---
  public getClaimsByBrand(brandId: string): Claim[] {
    const claims = this.data.claims || [];
    return claims.filter((c) => c.brandId === brandId);
  }

  public getAllClaims(): Claim[] {
    return this.data.claims || [];
  }

  public getClaimById(id: string): Claim | undefined {
    const claims = this.data.claims || [];
    return claims.find((c) => c.id === id);
  }

  public createClaim(claim: Claim): Claim {
    if (!this.data.claims) this.data.claims = [];
    this.data.claims.unshift(claim);
    this.persist();
    return claim;
  }

  public updateClaim(id: string, updates: Partial<Claim>): Claim | null {
    if (!this.data.claims) this.data.claims = [];
    const idx = this.data.claims.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.data.claims[idx] = {
      ...this.data.claims[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.data.claims[idx];
  }

  public deleteClaim(id: string): boolean {
    if (!this.data.claims) this.data.claims = [];
    const before = this.data.claims.length;
    this.data.claims = this.data.claims.filter((c) => c.id !== id);
    this.persist();
    return this.data.claims.length < before;
  }

  public resetDemoData(): void {
    const seed = this.getSeedData();
    this.data = seed;
    this.persist();
  }
}

export const db = new Database();
