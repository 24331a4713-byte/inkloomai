/**
 * INKLOOM AI - Deterministic Rule Engine
 * Handles exact pattern matching, boundary-aware prohibited terms,
 * required disclaimers, brand name casing, and explicit formatting.
 */

import { BrandRule, Finding, Brand } from '../types';

export function runDeterministicAudit(
  content: string,
  rules: BrandRule[],
  brand?: Brand
): Finding[] {
  const findings: Finding[] = [];

  // Filter only active, approved, deterministic or hybrid rules
  const activeRules = rules.filter(
    (r) => r.isActive && r.humanApprovalStatus === 'approved' && (r.ruleType === 'deterministic' || r.ruleType === 'visual')
  );

  for (const rule of activeRules) {
    if (!rule.detectionPattern && !rule.sourceExcerpt) {
      continue;
    }

    const pattern = rule.detectionPattern || '';
    if (!pattern.trim()) continue;

    // Category 1: Prohibited Phrases / Restricted Terminology
    if (
      rule.category === 'prohibited_claims' ||
      rule.category === 'restricted_terminology' ||
      rule.category === 'unsupported_factual_claims'
    ) {
      const occurrences = findWordBoundaryOccurrences(content, pattern, rule.caseSensitive ?? false);
      for (const occ of occurrences) {
        findings.push({
          id: `det-${rule.id}-${occ.startChar}`,
          ruleId: rule.id,
          ruleCategory: rule.category,
          ruleDescription: rule.ruleDescription,
          sourceDocId: rule.sourceDocId,
          sourceDocTitle: rule.sourceDocTitle,
          pageOrSection: rule.pageOrSection,
          sourceExcerpt: rule.sourceExcerpt,
          quotedText: occ.matchedText,
          location: {
            startChar: occ.startChar,
            endChar: occ.endChar,
          },
          severity: rule.severity,
          explanation: `Explicit prohibited statement found: "${occ.matchedText}". Guideline prohibits this claim.`,
          evidence: rule.sourceExcerpt,
          suggestedCorrection: rule.targetReplacement || undefined,
          confidence: 'high',
          detectionMethod: 'deterministic',
          resolutionStatus: 'open',
        });
      }
    }

    // Category 2: Required Disclaimers
    else if (rule.category === 'required_disclaimers') {
      const cleanContent = content.toLowerCase();
      const cleanPattern = pattern.toLowerCase();
      // If the required disclaimer phrase is absent
      if (!cleanContent.includes(cleanPattern)) {
        findings.push({
          id: `det-${rule.id}-missing`,
          ruleId: rule.id,
          ruleCategory: rule.category,
          ruleDescription: rule.ruleDescription,
          sourceDocId: rule.sourceDocId,
          sourceDocTitle: rule.sourceDocTitle,
          pageOrSection: rule.pageOrSection,
          sourceExcerpt: rule.sourceExcerpt,
          quotedText: `[Missing required statement: "${pattern}"]`,
          location: {
            startChar: 0,
            endChar: Math.min(content.length, 30),
          },
          severity: rule.severity,
          explanation: `Mandatory disclaimer is missing from the content. Guideline requires: "${pattern}"`,
          evidence: rule.sourceExcerpt,
          suggestedCorrection: rule.targetReplacement || `Add: "${pattern}"`,
          confidence: 'high',
          detectionMethod: 'deterministic',
          resolutionStatus: 'open',
        });
      }
    }

    // Category 3: Brand Spelling & Naming
    else if (rule.category === 'brand_spelling_naming') {
      const correctName = pattern;
      // Search for misspellings or casing errors
      // E.g., if correct name is "Solaria", check case variations like "solaria" or common misspellings
      const regex = new RegExp(`\\b${escapeRegExp(correctName)}\\b`, 'gi');
      let match: RegExpExecArray | null;
      while ((match = regex.exec(content)) !== null) {
        const found = match[0];
        if (found !== correctName) {
          findings.push({
            id: `det-${rule.id}-${match.index}`,
            ruleId: rule.id,
            ruleCategory: rule.category,
            ruleDescription: rule.ruleDescription,
            sourceDocId: rule.sourceDocId,
            sourceDocTitle: rule.sourceDocTitle,
            pageOrSection: rule.pageOrSection,
            sourceExcerpt: rule.sourceExcerpt,
            quotedText: found,
            location: {
              startChar: match.index,
              endChar: match.index + found.length,
            },
            severity: rule.severity,
            explanation: `Brand name capitalization or spelling mismatch: "${found}". Approved brand name is "${correctName}".`,
            evidence: rule.sourceExcerpt,
            suggestedCorrection: correctName,
            confidence: 'high',
            detectionMethod: 'deterministic',
            resolutionStatus: 'open',
          });
        }
      }
    }

    // Category 4: Preferred Terminology (flagging non-preferred alternatives)
    else if (rule.category === 'preferred_terminology' && rule.detectionPattern) {
      const occurrences = findWordBoundaryOccurrences(content, pattern, false);
      for (const occ of occurrences) {
        findings.push({
          id: `det-${rule.id}-${occ.startChar}`,
          ruleId: rule.id,
          ruleCategory: rule.category,
          ruleDescription: rule.ruleDescription,
          sourceDocId: rule.sourceDocId,
          sourceDocTitle: rule.sourceDocTitle,
          pageOrSection: rule.pageOrSection,
          sourceExcerpt: rule.sourceExcerpt,
          quotedText: occ.matchedText,
          location: {
            startChar: occ.startChar,
            endChar: occ.endChar,
          },
          severity: rule.severity,
          explanation: `Non-preferred term used: "${occ.matchedText}". Guideline prefers: "${rule.targetReplacement || 'approved terminology'}".`,
          evidence: rule.sourceExcerpt,
          suggestedCorrection: rule.targetReplacement,
          confidence: 'high',
          detectionMethod: 'deterministic',
          resolutionStatus: 'open',
        });
      }
    }
  }

  // Check Brand-specific naming rule if configured on brand directly
  if (brand && brand.name) {
    const brandName = brand.name;
    const regex = new RegExp(`\\b${escapeRegExp(brandName)}\\b`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const found = match[0];
      if (found !== brandName) {
        // Find existing rule or make a brand naming rule
        const existingRule = activeRules.find((r) => r.category === 'brand_spelling_naming');
        if (existingRule) {
          // Avoid duplicate finding if already caught above
          const already = findings.some((f) => f.location.startChar === match!.index);
          if (!already) {
            findings.push({
              id: `det-brand-${match.index}`,
              ruleId: existingRule.id,
              ruleCategory: 'brand_spelling_naming',
              ruleDescription: `Use exact brand name "${brandName}"`,
              sourceDocId: existingRule.sourceDocId,
              sourceDocTitle: existingRule.sourceDocTitle,
              pageOrSection: existingRule.pageOrSection,
              sourceExcerpt: existingRule.sourceExcerpt,
              quotedText: found,
              location: {
                startChar: match.index,
                endChar: match.index + found.length,
              },
              severity: 'major',
              explanation: `Brand name must be styled as "${brandName}", found "${found}".`,
              evidence: `Brand configuration for ${brandName}`,
              suggestedCorrection: brandName,
              confidence: 'high',
              detectionMethod: 'deterministic',
              resolutionStatus: 'open',
            });
          }
        }
      }
    }
  }

  return findings;
}

/**
 * Boundary-aware search:
 * Ensures we don't match substrings inside larger words (e.g. "claims" inside "acclaims" or "proclaims",
 * or "sun" inside "sunny").
 */
export function findWordBoundaryOccurrences(
  text: string,
  phrase: string,
  caseSensitive: boolean = false
): { startChar: number; endChar: number; matchedText: string }[] {
  const results: { startChar: number; endChar: number; matchedText: string }[] = [];
  if (!phrase || !text) return results;

  const escaped = escapeRegExp(phrase.trim());
  // If phrase starts and ends with alphanumeric characters, apply \b word boundary
  const startsWord = /^\w/.test(phrase);
  const endsWord = /\w$/.test(phrase);

  const pattern = `${startsWord ? '\\b' : ''}${escaped}${endsWord ? '\\b' : ''}`;
  const flags = caseSensitive ? 'g' : 'gi';

  try {
    const regex = new RegExp(pattern, flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      results.push({
        startChar: match.index,
        endChar: match.index + match[0].length,
        matchedText: match[0],
      });
    }
  } catch (err) {
    // Fallback to literal search
    let index = 0;
    const target = caseSensitive ? text : text.toLowerCase();
    const query = caseSensitive ? phrase : phrase.toLowerCase();
    while ((index = target.indexOf(query, index)) !== -1) {
      results.push({
        startChar: index,
        endChar: index + phrase.length,
        matchedText: text.substring(index, index + phrase.length),
      });
      index += query.length;
    }
  }

  return results;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
