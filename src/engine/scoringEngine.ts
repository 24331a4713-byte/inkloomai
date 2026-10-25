/**
 * INKLOOM AI - Compliance Score Engine
 * Deterministic, transparent, and reproducible scoring calculation.
 * Implements the formula specified in Section 12:
 *
 * Critical weight: 10
 * Major weight: 5
 * Minor weight: 2
 *
 * Potential penalty = sum of the weights of confirmed violations (deduplicated by rule)
 * Maximum penalty = sum of the weights of all applicable, assessable rules
 * Compliance score = 100 × (1 - potential penalty / maximum penalty)
 */

import { Finding, BrandRule, ScoreCalculation, SeverityLevel } from '../types';

export const SEVERITY_WEIGHTS: Record<SeverityLevel, number> = {
  critical: 10,
  major: 5,
  minor: 2,
};

export function calculateComplianceScore(
  validatedFindings: Finding[],
  applicableRules: BrandRule[],
  isAIRequestIncomplete: boolean = false,
  aiFailureReason?: string
): ScoreCalculation {
  const uncheckedReasons: string[] = [];

  // Filter only active and approved rules
  const assessableRules = applicableRules.filter(
    (r) => r.isActive && r.humanApprovalStatus === 'approved'
  );

  // If no active guidelines exist or none are assessable
  if (assessableRules.length === 0) {
    return {
      criticalCount: 0,
      majorCount: 0,
      minorCount: 0,
      criticalWeight: SEVERITY_WEIGHTS.critical,
      majorWeight: SEVERITY_WEIGHTS.major,
      minorWeight: SEVERITY_WEIGHTS.minor,
      potentialPenalty: 0,
      maxPenalty: 0,
      complianceScore: null, // "Not enough information to calculate a score"
      isProvisional: false,
      uncheckedReasons: ['No active, approved brand guidelines are configured for this brand.'],
      formulaExplanation:
        'Score cannot be calculated: 0 assessable rules. Brand must have active approved rules.',
      ruleOutcomes: [],
    };
  }

  // Calculate maximum penalty from all applicable rules
  let maxPenalty = 0;
  for (const rule of assessableRules) {
    maxPenalty += SEVERITY_WEIGHTS[rule.severity] || 5;
  }

  // Deduplicate violations by rule ID so multiple occurrences don't inflate penalty beyond rule weight
  const violatedRuleMap = new Map<string, { severity: SeverityLevel; findingCount: number }>();
  let criticalCount = 0;
  let majorCount = 0;
  let minorCount = 0;

  for (const finding of validatedFindings) {
    // Only count active confirmed violations (not dismissed or quarantined)
    if (finding.resolutionStatus !== 'quarantined' && finding.resolutionStatus !== 'dismissed') {
      if (!violatedRuleMap.has(finding.ruleId)) {
        violatedRuleMap.set(finding.ruleId, {
          severity: finding.severity,
          findingCount: 1,
        });
        if (finding.severity === 'critical') criticalCount++;
        else if (finding.severity === 'major') majorCount++;
        else if (finding.severity === 'minor') minorCount++;
      } else {
        violatedRuleMap.get(finding.ruleId)!.findingCount++;
      }
    }
  }

  // Sum potential penalty
  let potentialPenalty = 0;
  for (const [, violation] of violatedRuleMap) {
    potentialPenalty += SEVERITY_WEIGHTS[violation.severity] || 5;
  }

  // Cap potential penalty to maxPenalty so score does not dip below 0
  const effectivePenalty = Math.min(potentialPenalty, maxPenalty);

  // Compute raw score
  let rawScore = 0;
  if (maxPenalty > 0) {
    rawScore = 100 * (1 - effectivePenalty / maxPenalty);
  }

  const roundedScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  // Build rule outcomes map
  const ruleOutcomes = assessableRules.map((rule) => {
    const hasViolation = violatedRuleMap.has(rule.id);
    return {
      ruleId: rule.id,
      ruleDescription: rule.ruleDescription,
      severity: rule.severity,
      outcome: hasViolation ? ('violation' as const) : ('pass' as const),
    };
  });

  if (isAIRequestIncomplete) {
    uncheckedReasons.push(
      aiFailureReason || 'Semantic AI evaluation was unavailable; score represents deterministic checks only.'
    );
  }

  const formulaExplanation = `Potential penalty (${potentialPenalty}) / Maximum penalty (${maxPenalty}) = ${
    maxPenalty > 0 ? (effectivePenalty / maxPenalty).toFixed(3) : '0'
  }. Score: 100 × (1 - ${maxPenalty > 0 ? (effectivePenalty / maxPenalty).toFixed(3) : '0'}) = ${roundedScore}%`;

  return {
    criticalCount,
    majorCount,
    minorCount,
    criticalWeight: SEVERITY_WEIGHTS.critical,
    majorWeight: SEVERITY_WEIGHTS.major,
    minorWeight: SEVERITY_WEIGHTS.minor,
    potentialPenalty,
    maxPenalty,
    complianceScore: roundedScore,
    isProvisional: isAIRequestIncomplete,
    uncheckedReasons,
    formulaExplanation,
    ruleOutcomes,
  };
}
