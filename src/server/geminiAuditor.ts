/**
 * INKLOOM AI - Server-Side Gemini Auditor
 * Uses @google/genai SDK with gemini-3.8-flash to evaluate contextual and semantic brand rules.
 * Strictly enforces that Gemini receives only the selected brand's active approved rules.
 * Handles API errors gracefully without fabricating false approvals.
 */

import { GoogleGenAI, Type } from '@google/genai';
import { BrandRule, Finding } from '../types';

export interface SemanticAuditResponse {
  success: boolean;
  findings: Finding[];
  errorMessage?: string;
  isFallback?: boolean;
}

export async function runSemanticGeminiAudit(
  draftContent: string,
  activeRules: BrandRule[],
  brandName: string
): Promise<SemanticAuditResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return runSemanticHeuristicFallback(
      draftContent,
      activeRules,
      'GEMINI_API_KEY is not configured on the server. Semantic evaluation completed in local rule verification mode.'
    );
  }

  // Filter semantic / hybrid rules only
  const semanticRules = activeRules.filter(
    (r) =>
      r.isActive &&
      r.humanApprovalStatus === 'approved' &&
      (r.ruleType === 'semantic' ||
        r.category === 'unsupported_factual_claims' ||
        r.category === 'tone_of_voice' ||
        r.category === 'prohibited_claims')
  );

  if (semanticRules.length === 0) {
    return {
      success: true,
      findings: [],
    };
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Provide only authorized rules
  const rulesSummary = semanticRules.map((r) => ({
    ruleId: r.id,
    category: r.category,
    description: r.ruleDescription,
    severity: r.severity,
    sourceDocId: r.sourceDocId,
    sourceDocTitle: r.sourceDocTitle,
    pageOrSection: r.pageOrSection,
    sourceExcerpt: r.sourceExcerpt,
    authorizedReplacement: r.targetReplacement || null,
  }));

  const systemInstruction = `You are the rigorous compliance auditor for INKLOOM AI, analyzing marketing content for "${brandName}".
CRITICAL CONSTRAINTS:
1. ONLY evaluate against the explicitly provided brand rules in JSON. Do NOT invent new rules, policies, or standard laws.
2. In each finding, the "quotedText" field MUST be an EXACT, VERBATIM substring copied directly from the user's submitted draft. Never paraphrase quoted text.
3. In each finding, the "ruleId" MUST exactly match one of the provided rule IDs. Never invent a rule ID.
4. If a statement in the draft does not violate any provided rule, DO NOT flag it.
5. If the draft contains exaggerated claims, unsupported promises, unauthorized medical or factual assertions, or conflicts with the provided rules, create a finding.
6. Provide an honest suggested correction grounded ONLY in the rule's authorized wording. If the rule does not provide enough info for a safe correction, leave suggestedCorrection empty.`;

  const userPrompt = `BRAND NAME: ${brandName}

APPROVED BRAND RULES TO AUDIT AGAINST:
${JSON.stringify(rulesSummary, null, 2)}

SUBMITTED MARKETING DRAFT TO AUDIT:
"""
${draftContent}
"""

Analyze the draft against the approved rules. Return all validated compliance violations.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.1, // High precision
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            findings: {
              type: Type.ARRAY,
              description: 'List of verified compliance violations in the draft',
              items: {
                type: Type.OBJECT,
                properties: {
                  ruleId: {
                    type: Type.STRING,
                    description: 'Exact rule ID from the provided rules list',
                  },
                  quotedText: {
                    type: Type.STRING,
                    description: 'Verbatim excerpt from draft that violates the rule',
                  },
                  severity: {
                    type: Type.STRING,
                    enum: ['critical', 'major', 'minor'],
                    description: 'Severity level matching the rule or assessed risk',
                  },
                  explanation: {
                    type: Type.STRING,
                    description: 'Plain language explanation of why this was flagged',
                  },
                  evidence: {
                    type: Type.STRING,
                    description: 'Exact quote or section from the brand guideline supporting this violation',
                  },
                  suggestedCorrection: {
                    type: Type.STRING,
                    description: 'Authorized replacement text grounded in guidelines, or empty',
                  },
                  confidence: {
                    type: Type.STRING,
                    enum: ['high', 'medium', 'needs_human_review'],
                    description: 'Confidence in this violation',
                  },
                },
                required: ['ruleId', 'quotedText', 'severity', 'explanation', 'evidence', 'confidence'],
              },
            },
          },
          required: ['findings'],
        },
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    const rawList = Array.isArray(parsed.findings) ? parsed.findings : [];

    const findings: Finding[] = rawList.map((item: any, idx: number) => {
      const matchedRule = semanticRules.find((r) => r.id === item.ruleId);
      const startIdx = draftContent.indexOf(item.quotedText);

      return {
        id: `sem-${item.ruleId}-${idx}`,
        ruleId: item.ruleId,
        ruleCategory: matchedRule ? matchedRule.category : 'unsupported_factual_claims',
        ruleDescription: matchedRule ? matchedRule.ruleDescription : 'Semantic brand rule violation',
        sourceDocId: matchedRule ? matchedRule.sourceDocId : '',
        sourceDocTitle: matchedRule ? matchedRule.sourceDocTitle : '',
        pageOrSection: matchedRule ? matchedRule.pageOrSection : '',
        sourceExcerpt: matchedRule ? matchedRule.sourceExcerpt : item.evidence,
        quotedText: item.quotedText || '',
        location: {
          startChar: startIdx !== -1 ? startIdx : 0,
          endChar: startIdx !== -1 ? startIdx + (item.quotedText?.length || 0) : 0,
        },
        severity: (item.severity as any) || (matchedRule ? matchedRule.severity : 'major'),
        explanation: item.explanation,
        evidence: item.evidence || (matchedRule ? matchedRule.sourceExcerpt : ''),
        suggestedCorrection: item.suggestedCorrection || (matchedRule ? matchedRule.targetReplacement : undefined),
        confidence: item.confidence || 'high',
        detectionMethod: 'semantic',
        resolutionStatus: 'open',
      };
    });

    return {
      success: true,
      findings,
    };
  } catch (err: any) {
    // Format human-readable notice without printing raw stack traces to stderr
    let friendlyReason = 'Gemini semantic analysis service encountered a temporary network limitation.';
    const rawMsg = err?.message || '';

    if (rawMsg.includes('403') || rawMsg.includes('PERMISSION_DENIED')) {
      friendlyReason = 'Gemini API project access is currently restricted (403 Permission Denied). The audit engine automatically ran local deterministic & heuristic verification.';
    } else if (rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED')) {
      friendlyReason = 'Gemini API quota rate limit reached. The audit engine ran local deterministic & heuristic verification.';
    }

    console.warn('[Inkloom Audit Notice]', friendlyReason);

    return runSemanticHeuristicFallback(draftContent, semanticRules, friendlyReason);
  }
}

/**
 * Heuristic fallback for semantic rules when the external Gemini API is unreachable or denied.
 * Ensures rules with known patterns (e.g. "prevents skin cancer", "erases sun damage") are
 * still verified locally rather than missed entirely.
 */
function runSemanticHeuristicFallback(
  draft: string,
  rules: BrandRule[],
  reason: string
): SemanticAuditResponse {
  const fallbackFindings: Finding[] = [];

  for (const rule of rules) {
    if (rule.detectionPattern) {
      const idx = draft.toLowerCase().indexOf(rule.detectionPattern.toLowerCase());
      if (idx !== -1) {
        const verbatim = draft.substring(idx, idx + rule.detectionPattern.length);
        fallbackFindings.push({
          id: `sem-fallback-${rule.id}-${idx}`,
          ruleId: rule.id,
          ruleCategory: rule.category,
          ruleDescription: rule.ruleDescription,
          sourceDocId: rule.sourceDocId,
          sourceDocTitle: rule.sourceDocTitle,
          pageOrSection: rule.pageOrSection,
          sourceExcerpt: rule.sourceExcerpt,
          quotedText: verbatim,
          location: {
            startChar: idx,
            endChar: idx + verbatim.length,
          },
          severity: rule.severity,
          explanation: `Contextual claim flagged: "${verbatim}". Guideline requires qualified authorization.`,
          evidence: rule.sourceExcerpt,
          suggestedCorrection: rule.targetReplacement,
          confidence: 'high',
          detectionMethod: 'semantic',
          resolutionStatus: 'open',
        });
      }
    }
  }

  return {
    success: false,
    findings: fallbackFindings,
    errorMessage: reason,
    isFallback: true,
  };
}
