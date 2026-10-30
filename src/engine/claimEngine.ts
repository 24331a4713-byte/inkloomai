/**
 * INKLOOM AI - Claim Registry Governance Engine
 * Validates marketing draft copy against substantiated brand claims in the Claim Registry.
 * Enforces expiration date tracking, approval status checks, and flags unsupported factual assertions.
 */

import { Claim, Finding, Brand } from '../types';

export interface ClaimAuditResult {
  findings: Finding[];
  verifiedClaims: {
    claim: Claim;
    matchedText: string;
    expiryDate: string;
    daysRemaining: number;
  }[];
  unsupportedClaimsFound: number;
}

/**
 * Checks a draft against the brand's approved, pending, expired, and rejected claims.
 */
export function runClaimRegistryAudit(
  draft: string,
  claims: Claim[],
  brand: Brand
): ClaimAuditResult {
  const findings: Finding[] = [];
  const verifiedClaims: ClaimAuditResult['verifiedClaims'] = [];
  const now = new Date();

  if (!draft || draft.trim().length === 0) {
    return { findings, verifiedClaims, unsupportedClaimsFound: 0 };
  }

  const normalizedDraft = draft.toLowerCase();

  // 1. Check each registered claim against the draft
  for (const claim of claims) {
    if (!claim.claimText) continue;

    const normalizedClaim = claim.claimText.toLowerCase().trim();
    // Match either full claim text or strong characteristic segments (e.g., 5+ consecutive words)
    let isMatched = false;
    let matchedExcerpt = '';
    let startChar = -1;
    let endChar = -1;

    // Check full phrase match
    const fullIndex = normalizedDraft.indexOf(normalizedClaim);
    if (fullIndex !== -1) {
      isMatched = true;
      startChar = fullIndex;
      endChar = fullIndex + claim.claimText.length;
      matchedExcerpt = draft.substring(startChar, endChar);
    } else {
      // Check significant sub-phrase match (e.g. keywords like "all-day 24-hour hydration", "broad-spectrum spf 50+")
      const keyWords = normalizedClaim
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 3);

      if (keyWords.length >= 3) {
        // If 75% of key words appear close together
        const allPresent = keyWords.filter((kw) => normalizedDraft.includes(kw));
        if (allPresent.length >= Math.ceil(keyWords.length * 0.75)) {
          // Find first occurring keyword in draft to anchor snippet
          const anchorWord = allPresent[0];
          const anchorIdx = normalizedDraft.indexOf(anchorWord);
          if (anchorIdx !== -1) {
            isMatched = true;
            startChar = Math.max(0, anchorIdx - 10);
            endChar = Math.min(draft.length, anchorIdx + claim.claimText.length + 15);
            matchedExcerpt = draft.substring(startChar, endChar).trim();
          }
        }
      }
    }

    if (!isMatched) continue;

    // Calculate expiration
    const expiry = new Date(claim.expiryDate);
    const isExpired = !isNaN(expiry.getTime()) && expiry.getTime() < now.getTime();
    const daysRemaining = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // A. Check for Expired Claim
    if (claim.status === 'expired' || isExpired) {
      findings.push({
        id: `finding-claim-expired-${claim.id}`,
        ruleId: `claim-${claim.id}`,
        ruleCategory: 'unsupported_factual_claims',
        ruleDescription: `Expired Claim: "${claim.claimText}" expired on ${claim.expiryDate}`,
        sourceDocId: `registry-${claim.id}`,
        sourceDocTitle: `Claim Registry #${claim.id}`,
        pageOrSection: `Category: ${claim.category}`,
        sourceExcerpt: `Evidence: ${claim.sourceEvidence} | Expiry: ${claim.expiryDate} (Reviewer: ${claim.reviewerName || 'Unassigned'})`,
        quotedText: matchedExcerpt || claim.claimText,
        location: { startChar: Math.max(0, startChar), endChar: Math.max(0, endChar) },
        severity: 'critical',
        explanation: `This claim expired on ${claim.expiryDate} (${Math.abs(daysRemaining)} days ago). Regulators require active, recertified evidence before publication.`,
        evidence: `Claim Registry: ${claim.sourceEvidence}`,
        suggestedCorrection: claim.usageNotes || `Recertify claim evidence or remove the expired statement.`,
        confidence: 'high',
        detectionMethod: 'deterministic',
        resolutionStatus: 'open',
      });
      continue;
    }

    // B. Check for Rejected Claim
    if (claim.status === 'rejected') {
      findings.push({
        id: `finding-claim-rejected-${claim.id}`,
        ruleId: `claim-${claim.id}`,
        ruleCategory: 'prohibited_claims',
        ruleDescription: `Rejected Claim: "${claim.claimText}" was rejected during review`,
        sourceDocId: `registry-${claim.id}`,
        sourceDocTitle: `Claim Registry #${claim.id}`,
        pageOrSection: `Category: ${claim.category}`,
        sourceExcerpt: `Reviewer notes: ${claim.usageNotes || claim.sourceEvidence} (Rejected by: ${claim.reviewerName || 'Governance Board'})`,
        quotedText: matchedExcerpt || claim.claimText,
        location: { startChar: Math.max(0, startChar), endChar: Math.max(0, endChar) },
        severity: 'critical',
        explanation: `This claim was explicitly rejected during governance review. It cannot be used in consumer materials.`,
        evidence: `Governance Rejection: ${claim.usageNotes || claim.sourceEvidence}`,
        suggestedCorrection: `Remove this assertion immediately. Consult reviewer ${claim.reviewerName || 'Compliance'}.`,
        confidence: 'high',
        detectionMethod: 'deterministic',
        resolutionStatus: 'open',
      });
      continue;
    }

    // C. Check for Pending Review Claim
    if (claim.status === 'pending_review') {
      findings.push({
        id: `finding-claim-pending-${claim.id}`,
        ruleId: `claim-${claim.id}`,
        ruleCategory: 'unsupported_factual_claims',
        ruleDescription: `Unapproved Claim: "${claim.claimText}" is still pending review`,
        sourceDocId: `registry-${claim.id}`,
        sourceDocTitle: `Claim Registry #${claim.id}`,
        pageOrSection: `Category: ${claim.category}`,
        sourceExcerpt: `Dossier: ${claim.sourceEvidence} | Assigned Reviewer: ${claim.reviewerName || 'Pending Review'}`,
        quotedText: matchedExcerpt || claim.claimText,
        location: { startChar: Math.max(0, startChar), endChar: Math.max(0, endChar) },
        severity: 'major',
        explanation: `This claim is pending legal/medical sign-off (${claim.reviewerRole || 'Reviewer'}). Claims cannot be published before formal approval.`,
        evidence: `Claim Dossier: ${claim.sourceEvidence}`,
        suggestedCorrection: `Await official approval from ${claim.reviewerName || 'the review panel'} before running campaign.`,
        confidence: 'high',
        detectionMethod: 'deterministic',
        resolutionStatus: 'open',
      });
      continue;
    }

    // D. Approved Claim!
    if (claim.status === 'approved') {
      verifiedClaims.push({
        claim,
        matchedText: matchedExcerpt || claim.claimText,
        expiryDate: claim.expiryDate,
        daysRemaining,
      });
    }
  }

  // 2. Detect High-Risk Factual Statements that Lack Any Registry Substantiation
  const highRiskPatterns = [
    { pattern: /\bclinically proven\b/i, phrase: 'clinically proven' },
    { pattern: /\bscientifically proven\b/i, phrase: 'scientifically proven' },
    { pattern: /\bguarantees? permanent\b/i, phrase: 'guarantees permanent' },
    { pattern: /\b100% (?:protection|effective|safe|guaranteed)\b/i, phrase: '100% guarantee/protection' },
    { pattern: /\bcures? (?:sun damage|pigmentation|cancer|wrinkles)\b/i, phrase: 'cures skin condition' },
    { pattern: /\berases? sun damage forever\b/i, phrase: 'erases sun damage forever' },
    { pattern: /\bpatented formula\b/i, phrase: 'patented formula' },
  ];

  let unsupportedCount = 0;
  for (const { pattern, phrase } of highRiskPatterns) {
    const match = draft.match(pattern);
    if (match && match.index !== undefined) {
      // Verify if any approved claim substantiates this exact phrase
      const isSubstantiated = verifiedClaims.some((v) =>
        v.claim.claimText.toLowerCase().includes(phrase.toLowerCase())
      );

      if (!isSubstantiated) {
        unsupportedCount++;
        const start = match.index;
        const end = match.index + match[0].length;
        findings.push({
          id: `finding-unsupported-${phrase.replace(/\s+/g, '-')}-${start}`,
          ruleId: 'claim-substantiation-required',
          ruleCategory: 'unsupported_factual_claims',
          ruleDescription: `Unsubstantiated Marketing Claim: "${match[0]}" requires proof in Claim Registry`,
          sourceDocId: 'claim-policy',
          sourceDocTitle: `${brand.name} Factual Claims Policy`,
          pageOrSection: 'Claims Substantiation Guidelines',
          sourceExcerpt: 'All clinical, scientific, or absolute performance claims must be entered into the Claim Registry with accredited evidence before public release.',
          quotedText: match[0],
          location: { startChar: start, endChar: end },
          severity: 'major',
          explanation: `The assertion "${match[0]}" appears in the draft but is not substantiated by any approved entry in the ${brand.name} Claim Registry.`,
          evidence: 'Mandatory claim substantiation standard.',
          suggestedCorrection: 'Register authorized clinical trial dossier in the Claim Registry or soften copy.',
          confidence: 'high',
          detectionMethod: 'deterministic',
          resolutionStatus: 'open',
        });
      }
    }
  }

  return {
    findings,
    verifiedClaims,
    unsupportedClaimsFound: unsupportedCount,
  };
}
