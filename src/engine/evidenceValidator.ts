/**
 * INKLOOM AI - Evidence Validation and Deduplication Engine
 * Validates all candidate findings against actual submitted text and stored brand rules.
 * Quarantines unverified citations and deduplicates multi-engine matches.
 */

import { Finding, BrandRule, Brand } from '../types';

export interface ValidationResult {
  validatedFindings: Finding[];
  quarantinedFindings: Finding[];
}

export function validateAndDeduplicateFindings(
  rawFindings: Finding[],
  submittedDraft: string,
  activeBrandRules: BrandRule[],
  selectedBrand: Brand
): ValidationResult {
  const validatedFindings: Finding[] = [];
  const quarantinedFindings: Finding[] = [];

  const ruleMap = new Map<string, BrandRule>();
  for (const rule of activeBrandRules) {
    ruleMap.set(rule.id, rule);
  }

  for (const finding of rawFindings) {
    const issues: string[] = [];

    // 1. Verify cited rule exists in activeBrandRules (or in Claim Registry)
    const isClaimFinding = finding.ruleId.startsWith('claim-');
    const rule = ruleMap.get(finding.ruleId);
    if (!rule && !isClaimFinding) {
      issues.push(`Rule with ID "${finding.ruleId}" does not exist in active guidelines.`);
    } else if (rule) {
      // 2. Strict Brand Isolation: Rule must belong to the current brand
      if (rule.brandId !== selectedBrand.id) {
        issues.push(
          `Security violation: Rule "${finding.ruleId}" belongs to brand "${rule.brandId}", not the active brand "${selectedBrand.id}".`
        );
      }

      // 3. Rule must be active and human-approved
      if (!rule.isActive) {
        issues.push(`Rule "${finding.ruleId}" is currently inactive.`);
      }
      if (rule.humanApprovalStatus !== 'approved') {
        issues.push(`Rule "${finding.ruleId}" has approval status "${rule.humanApprovalStatus}" (must be "approved").`);
      }
    }

    // 4. Verify quoted text occurs in submitted draft (unless it's a missing disclaimer or visual finding)
    const isMissingDisclaimer =
      finding.ruleCategory === 'required_disclaimers' &&
      finding.quotedText.startsWith('[Missing required');
    const isVisualFinding = finding.detectionMethod === 'visual';

    let resolvedLocation = finding.location;

    if (!isMissingDisclaimer && !isVisualFinding) {
      const draftIndex = submittedDraft.indexOf(finding.quotedText);
      if (draftIndex === -1) {
        // Try case-insensitive lookup
        const lowerIndex = submittedDraft.toLowerCase().indexOf(finding.quotedText.toLowerCase());
        if (lowerIndex === -1) {
          issues.push(
            `Quoted text "${finding.quotedText.substring(0, 50)}..." does not exist verbatim in the submitted draft.`
          );
        } else {
          // Fix location and text to verbatim draft text
          resolvedLocation = {
            startChar: lowerIndex,
            endChar: lowerIndex + finding.quotedText.length,
          };
          finding.quotedText = submittedDraft.substring(lowerIndex, lowerIndex + finding.quotedText.length);
        }
      } else {
        resolvedLocation = {
          startChar: draftIndex,
          endChar: draftIndex + finding.quotedText.length,
        };
      }
    }

    if (issues.length > 0) {
      quarantinedFindings.push({
        ...finding,
        location: resolvedLocation,
        resolutionStatus: 'quarantined',
        confidence: 'insufficient_evidence',
        validationIssues: issues,
      });
    } else {
      // Attach verified rule fields for complete traceability
      if (rule) {
        validatedFindings.push({
          ...finding,
          location: resolvedLocation,
          ruleCategory: rule.category,
          ruleDescription: rule.ruleDescription,
          sourceDocId: rule.sourceDocId,
          sourceDocTitle: rule.sourceDocTitle,
          pageOrSection: rule.pageOrSection,
          sourceExcerpt: rule.sourceExcerpt,
          evidence: rule.sourceExcerpt,
          suggestedCorrection: finding.suggestedCorrection || rule.targetReplacement,
        });
      } else {
        // Claim Registry or self-contained engine finding
        validatedFindings.push({
          ...finding,
          location: resolvedLocation,
        });
      }
    }
  }

  // Deduplicate validated findings (e.g., when deterministic and semantic engines catch the same issue)
  const deduplicated = deduplicateFindings(validatedFindings);

  return {
    validatedFindings: deduplicated,
    quarantinedFindings,
  };
}

/**
 * Deduplicate findings that flag the same rule or overlapping character positions.
 */
function deduplicateFindings(findings: Finding[]): Finding[] {
  const result: Finding[] = [];

  for (const finding of findings) {
    const isDuplicate = result.some((existing) => {
      // Duplicate check: Same rule ID and overlapping text location
      const sameRule = existing.ruleId === finding.ruleId;
      const overlaps =
        Math.max(existing.location.startChar, finding.location.startChar) <
        Math.min(existing.location.endChar, finding.location.endChar);

      // Or exact same quoted text and rule category
      const sameText =
        existing.quotedText.trim().toLowerCase() === finding.quotedText.trim().toLowerCase() &&
        existing.ruleCategory === finding.ruleCategory;

      return (sameRule && overlaps) || (sameRule && sameText);
    });

    if (!isDuplicate) {
      result.push(finding);
    }
  }

  return result;
}
