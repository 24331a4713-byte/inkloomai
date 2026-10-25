/**
 * INKLOOM AI - Release Decision Engine
 * Evaluates whether campaign content is eligible for approval or release.
 * Strictly blocks release if critical violations exist or audit is stale.
 */

import { Finding, Campaign, Brand, ReleaseRecommendation, CampaignStatus, ScoreCalculation } from '../types';

export function evaluateReleaseDecision(
  campaign: Campaign,
  brand: Brand,
  validatedFindings: Finding[],
  quarantinedFindings: Finding[],
  scoreCalc: ScoreCalculation,
  isAuditStale: boolean,
  isAIRequestIncomplete: boolean = false
): ReleaseRecommendation {
  const blockingReasons: string[] = [];
  const requiresReviewReasons: string[] = [];

  // Check 1: Stale draft check
  if (isAuditStale) {
    blockingReasons.push(
      'Draft has been edited since the last audit. Content must be re-audited before release.'
    );
  }

  // Check 2: No guidelines or null score
  if (scoreCalc.complianceScore === null) {
    blockingReasons.push(
      'Brand has no active, approved guidelines. Brand rules must be activated before compliance can be certified.'
    );
  }

  // Check 3: Unresolved Critical Violations
  const openCriticals = validatedFindings.filter(
    (f) => f.severity === 'critical' && f.resolutionStatus === 'open'
  );
  if (openCriticals.length > 0) {
    blockingReasons.push(
      `${openCriticals.length} unresolved critical violation(s) block publication: ${openCriticals
        .map((c) => `"${c.quotedText.substring(0, 30)}"`)
        .join(', ')}`
    );
  }

  // Check 4: Unresolved Major Violations
  const openMajors = validatedFindings.filter(
    (f) => f.severity === 'major' && f.resolutionStatus === 'open'
  );
  if (openMajors.length > 0) {
    if (brand.approvalPolicy?.requireSignOffForMajor) {
      requiresReviewReasons.push(
        `${openMajors.length} open major compliance issue(s) require executive sign-off under brand policy.`
      );
    }
  }

  // Check 5: Quarantined findings / evidence gaps
  if (quarantinedFindings.length > 0) {
    requiresReviewReasons.push(
      `${quarantinedFindings.length} candidate finding(s) require human review due to evidence or source discrepancies.`
    );
  }

  // Check 6: Incomplete AI evaluation
  if (isAIRequestIncomplete) {
    requiresReviewReasons.push(
      'Audit was completed in provisional mode (deterministic checks only). Manual compliance review recommended.'
    );
  }

  // Determine status
  let recommendedStatus: CampaignStatus = 'ready_for_approval';
  let allowsRelease = false;

  if (blockingReasons.length > 0) {
    recommendedStatus = 'changes_required';
    allowsRelease = false;
  } else if (requiresReviewReasons.length > 0) {
    recommendedStatus = 'needs_human_review';
    allowsRelease = false;
  } else {
    recommendedStatus = 'ready_for_approval';
    allowsRelease = true;
  }

  return {
    recommendedStatus,
    blockingReasons,
    allowsRelease,
    requiresReviewReasons,
  };
}
