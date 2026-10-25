/**
 * INKLOOM AI - Live Audit Assistant
 * Provides contextual AI advice, explanation of findings, and safer wording proposals
 * grounded strictly in the brand's active rules and current draft.
 */

import { GoogleGenAI } from '@google/genai';
import { BrandRule, Finding } from '../types';

export interface AssistantChatRequest {
  brandName: string;
  draft: string;
  query: string;
  rules: BrandRule[];
  activeFindings: Finding[];
  history?: { role: 'user' | 'assistant'; text: string }[];
}

export async function handleAssistantChat(
  req: AssistantChatRequest
): Promise<{ reply: string; citedRuleIds: string[]; suggestedRewrites?: string[] }> {
  const { brandName, draft, query, rules, activeFindings, history = [] } = req;
  const apiKey = process.env.GEMINI_API_KEY;

  const relevantRules = rules.filter((r) => r.isActive && r.humanApprovalStatus === 'approved');

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const systemInstruction = `You are the Inkloom AI Brand Governance Assistant for the brand "${brandName}".
You help copywriters and marketers write compliant, high-performing copy aligned with their organization's approved brand guidelines.

MANDATORY RULES:
1. Ground your advice STRICTLY in the provided approved brand rules. Do NOT invent legal policies, medical claims, or rules that are not provided.
2. If the user asks why something was flagged, refer directly to the applicable rule and draft text.
3. If the user asks for a safer rewrite, provide 1-2 authorized alternatives that preserve the marketing intent while complying with the rules.
4. If there is insufficient information in the brand rules to give a definitive answer, honestly say: "Our current brand guidelines do not specify a policy for this, so human review by your compliance team is recommended."
5. Be concise, professional, encouraging, and clear.`;

      const rulesSummary = relevantRules.map((r) => ({
        id: r.id,
        category: r.category,
        description: r.ruleDescription,
        severity: r.severity,
        sourceExcerpt: r.sourceExcerpt,
        authorizedAlternative: r.targetReplacement,
      }));

      const findingsSummary = activeFindings.map((f) => ({
        ruleId: f.ruleId,
        quotedText: f.quotedText,
        explanation: f.explanation,
        suggestedCorrection: f.suggestedCorrection,
      }));

      const prompt = `BRAND: ${brandName}
APPROVED BRAND RULES:
${JSON.stringify(rulesSummary, null, 2)}

CURRENT CAMPAIGN DRAFT:
"""
${draft}
"""

CURRENT AUDIT FINDINGS:
${JSON.stringify(findingsSummary, null, 2)}

USER QUESTION:
"${query}"`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.2,
        },
      });

      const reply = response.text || 'I analyzed your request against the approved brand guidelines.';
      const citedRuleIds = relevantRules
        .filter((r) => reply.includes(r.id) || reply.toLowerCase().includes(r.ruleDescription.toLowerCase()))
        .map((r) => r.id);

      return {
        reply,
        citedRuleIds,
      };
    } catch (err: any) {
      console.warn('[Inkloom Assistant] API fallback active:', err?.message?.substring(0, 100));
    }
  }

  // Fallback intelligent responder based on brand rules
  const qLower = query.toLowerCase();
  const matchedRule = relevantRules.find(
    (r) =>
      qLower.includes(r.category.replace(/_/g, ' ')) ||
      (r.detectionPattern && qLower.includes(r.detectionPattern.toLowerCase())) ||
      qLower.includes(r.ruleDescription.toLowerCase())
  );

  if (matchedRule) {
    return {
      reply: `Regarding your inquiry, approved rule **${matchedRule.id}** (${matchedRule.category.replace(
        /_/g,
        ' '
      )}) specifies: "${matchedRule.ruleDescription}".\n\n**Source excerpt:** "${
        matchedRule.sourceExcerpt
      }"\n\n**Approved Alternative:** ${
        matchedRule.targetReplacement ? `"${matchedRule.targetReplacement}"` : 'Please consult your compliance officer.'
      }`,
      citedRuleIds: [matchedRule.id],
    };
  }

  if (qLower.includes('fix') || qLower.includes('rewrite') || qLower.includes('correction')) {
    if (activeFindings.length > 0) {
      const f = activeFindings[0];
      return {
        reply: `For the flagged issue "${f.quotedText}", the governing guideline (${f.ruleDescription}) recommends: "${
          f.suggestedCorrection || 'substantiating the claim with authorized monograph references'
        }".`,
        citedRuleIds: [f.ruleId],
      };
    }
  }

  return {
    reply: `I am monitoring ${relevantRules.length} active approved brand guidelines for **${brandName}**. Ask me how to phrase specific claims, why a sentence was flagged, or which disclaimers are mandatory for this channel.`,
    citedRuleIds: [],
  };
}
