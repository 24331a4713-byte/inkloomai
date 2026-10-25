/**
 * INKLOOM AI - Type Definitions
 * Strict Brand Governance and Content Quality Assurance
 */

export type RuleCategory =
  | 'prohibited_claims'
  | 'unsupported_factual_claims'
  | 'required_disclaimers'
  | 'restricted_terminology'
  | 'preferred_terminology'
  | 'tone_of_voice'
  | 'brand_spelling_naming'
  | 'visual_identity'
  | 'logo_usage'
  | 'color_rules'
  | 'formatting'
  | 'regulatory_legal'
  | 'other';

export type RuleType = 'deterministic' | 'semantic' | 'visual';
export type SeverityLevel = 'critical' | 'major' | 'minor';

export type ContentScope =
  | 'all'
  | 'social_media'
  | 'advertisements'
  | 'product_descriptions'
  | 'website_copy'
  | 'email_campaigns'
  | 'landing_pages'
  | 'blog_content'
  | 'marketing_scripts';

export type HumanApprovalStatus = 'approved' | 'pending_review' | 'rejected' | 'needs_clarification';

export interface Brand {
  id: string;
  name: string;
  industry: string;
  description: string;
  primaryLanguage: string;
  website?: string;
  logoUrl?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
  approvalPolicy: {
    requireSignOffForMajor: boolean;
    requireSignOffForMinor: boolean;
    allowedReviewers: string[];
  };
  visualPalette: {
    primaryColor: string;
    secondaryColor: string;
    prohibitedBackgrounds: string[];
    requiredLogoAspectRatios: string[];
  };
}

export interface GuidelineDocument {
  id: string;
  brandId: string;
  title: string;
  fileName: string;
  fileType: string;
  version: number;
  uploadedAt: string;
  extractedText: string;
  status: 'processing' | 'extracted' | 'active' | 'archived';
  rulesCount?: number;
}

export interface BrandRule {
  id: string;
  brandId: string;
  sourceDocId: string;
  sourceDocTitle: string;
  sourceDocVersion: number;
  sourceExcerpt: string;
  pageOrSection: string;
  category: RuleCategory;
  ruleDescription: string;
  ruleType: RuleType;
  severity: SeverityLevel;
  scope: ContentScope;
  detectionPattern?: string; // Exact phrase, regex, or prohibited keyword
  caseSensitive?: boolean;
  targetReplacement?: string; // Authorized suggested correction
  isActive: boolean;
  humanApprovalStatus: HumanApprovalStatus;
  clarificationNotes?: string;
  createdAt: string;
}

export type CampaignStatus =
  | 'draft'
  | 'auditing'
  | 'audit_failed'
  | 'changes_required'
  | 'needs_human_review'
  | 'ready_for_approval'
  | 'approved'
  | 'rejected'
  | 'released';

export interface Campaign {
  id: string;
  brandId: string;
  name: string;
  contentType: ContentScope;
  targetAudience: string;
  language: string;
  currentDraft: string;
  draftVersion: number;
  draftHash: string;
  visualAssetUrl?: string;
  visualAssetFileName?: string;
  visualAssetAnalysis?: VisualAssetReport;
  status: CampaignStatus;
  lastAuditedVersion?: number;
  lastAuditId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DraftRevision {
  id: string;
  campaignId: string;
  version: number;
  content: string;
  changeSummary: string;
  createdAt: string;
  auditId?: string;
}

export interface Finding {
  id: string;
  ruleId: string;
  ruleCategory: RuleCategory;
  ruleDescription: string;
  sourceDocId: string;
  sourceDocTitle: string;
  pageOrSection: string;
  sourceExcerpt: string;
  quotedText: string;
  location: {
    startChar: number;
    endChar: number;
  };
  severity: SeverityLevel;
  explanation: string;
  evidence: string;
  suggestedCorrection?: string;
  confidence: 'high' | 'medium' | 'needs_human_review' | 'insufficient_evidence';
  detectionMethod: RuleType;
  resolutionStatus: 'open' | 'accepted_correction' | 'edited_correction' | 'dismissed' | 'quarantined';
  dismissalReason?: string;
  userCorrection?: string;
  validationIssues?: string[];
}

export interface VisualAssetReport {
  hasImage: boolean;
  imageUrl?: string;
  fileName?: string;
  detectedColors?: string[];
  backgroundColor?: string;
  hasLogoDetected?: boolean;
  aspectRatioDetected?: string;
  textExtractedFromImage?: string;
  visualFindings: Finding[];
}

export interface ScoreCalculation {
  criticalCount: number;
  majorCount: number;
  minorCount: number;
  criticalWeight: number;
  majorWeight: number;
  minorWeight: number;
  potentialPenalty: number;
  maxPenalty: number;
  complianceScore: number | null; // null if not enough information
  isProvisional: boolean;
  uncheckedReasons: string[];
  formulaExplanation: string;
  ruleOutcomes: {
    ruleId: string;
    ruleDescription: string;
    severity: SeverityLevel;
    outcome: 'pass' | 'violation' | 'needs_review' | 'not_applicable';
  }[];
}

export interface ReleaseRecommendation {
  recommendedStatus: CampaignStatus;
  blockingReasons: string[];
  allowsRelease: boolean;
  requiresReviewReasons: string[];
}

export interface AuditRun {
  id: string;
  brandId: string;
  campaignId: string;
  draftVersion: number;
  draftHash: string;
  activeGuidelineIds: string[];
  applicableRuleIds: string[];
  timestamp: string;
  engineVersion: string;
  deterministicFindings: Finding[];
  semanticFindings: Finding[];
  visualFindings: Finding[];
  validatedFindings: Finding[];
  quarantinedFindings: Finding[];
  scoreCalculation: ScoreCalculation;
  releaseRecommendation: ReleaseRecommendation;
  aiRequestFailed: boolean;
  aiFailureReason?: string;
}

export interface ApprovalRecord {
  id: string;
  campaignId: string;
  auditId: string;
  action: 'approved' | 'rejected' | 'released' | 'sign_off_requested';
  reviewerName: string;
  reviewerRole: string;
  timestamp: string;
  comments: string;
}

export interface RegressionTestResult {
  testId: string;
  title: string;
  description: string;
  passed: boolean;
  expectedBehavior: string;
  actualOutcome: string;
  evidence: Record<string, unknown>;
  durationMs: number;
}
