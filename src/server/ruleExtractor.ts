/**
 * INKLOOM AI - Guideline Rule Extractor
 * Parses uploaded brand documents (Markdown, Plaintext, Policies)
 * and extracts candidate structured BrandRule entities for human review.
 */

import { GoogleGenAI, Type } from '@google/genai';
import { BrandRule, RuleCategory, SeverityLevel, RuleType, ContentScope } from '../types';

export async function extractRulesFromText(
  documentText: string,
  docId: string,
  docTitle: string,
  brandId: string
): Promise<BrandRule[]> {
  const apiKey = process.env.GEMINI_API_KEY;

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

      const prompt = `Analyze this brand guidelines document and extract structured compliance rules.
IMPORTANT RULES:
1. Do NOT turn headings like "Avoid Misleading Claims" into rules banning the ordinary word "claims".
2. Distinguish between prohibited phrases, tone guidelines, required disclaimers, brand spelling, and visual restrictions.
3. For each rule, capture the exact source excerpt and section reference.

DOCUMENT TITLE: "${docTitle}"
DOCUMENT TEXT:
"""
${documentText.substring(0, 15000)}
"""`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'You are an expert brand governance architect. Extract precise, machine-actionable brand rules from guidelines without creating false positives on common words.',
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              extractedRules: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: {
                      type: Type.STRING,
                      enum: [
                        'prohibited_claims',
                        'unsupported_factual_claims',
                        'required_disclaimers',
                        'restricted_terminology',
                        'preferred_terminology',
                        'tone_of_voice',
                        'brand_spelling_naming',
                        'visual_identity',
                        'logo_usage',
                        'color_rules',
                        'formatting',
                        'regulatory_legal',
                        'other',
                      ],
                    },
                    ruleDescription: { type: Type.STRING },
                    ruleType: { type: Type.STRING, enum: ['deterministic', 'semantic', 'visual'] },
                    severity: { type: Type.STRING, enum: ['critical', 'major', 'minor'] },
                    scope: {
                      type: Type.STRING,
                      enum: [
                        'all',
                        'social_media',
                        'advertisements',
                        'product_descriptions',
                        'website_copy',
                        'email_campaigns',
                        'landing_pages',
                        'blog_content',
                        'marketing_scripts',
                      ],
                    },
                    pageOrSection: { type: Type.STRING },
                    sourceExcerpt: { type: Type.STRING },
                    detectionPattern: { type: Type.STRING, description: 'Exact phrase or key for deterministic rules, or empty' },
                    targetReplacement: { type: Type.STRING, description: 'Approved alternative phrase or correction' },
                  },
                  required: ['category', 'ruleDescription', 'ruleType', 'severity', 'scope', 'sourceExcerpt'],
                },
              },
            },
            required: ['extractedRules'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      if (Array.isArray(parsed.extractedRules) && parsed.extractedRules.length > 0) {
        return parsed.extractedRules.map((r: any, idx: number) => ({
          id: `rule-${Date.now()}-${idx}`,
          brandId,
          sourceDocId: docId,
          sourceDocTitle: docTitle,
          sourceDocVersion: 1,
          sourceExcerpt: r.sourceExcerpt || '',
          pageOrSection: r.pageOrSection || 'General',
          category: r.category as RuleCategory,
          ruleDescription: r.ruleDescription,
          ruleType: r.ruleType as RuleType,
          severity: r.severity as SeverityLevel,
          scope: (r.scope as ContentScope) || 'all',
          detectionPattern: r.detectionPattern || undefined,
          targetReplacement: r.targetReplacement || undefined,
          isActive: true,
          humanApprovalStatus: 'pending_review', // Requires user review before activation!
          createdAt: new Date().toISOString(),
        }));
      }
    } catch (err: any) {
      console.warn('[Inkloom Ingestion] AI extraction fallback active:', err?.message?.substring(0, 100));
    }
  }

  // Deterministic Rule Extraction Fallback
  return fallbackRuleExtraction(documentText, docId, docTitle, brandId);
}

function fallbackRuleExtraction(
  text: string,
  docId: string,
  docTitle: string,
  brandId: string
): BrandRule[] {
  const rules: BrandRule[] = [];
  const lines = text.split('\n');
  let currentSection = 'General';

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || trimmed.toLowerCase().startsWith('section')) {
      currentSection = trimmed.replace(/^#+\s*/, '');
      return;
    }

    if (
      trimmed.toLowerCase().includes('do not claim') ||
      trimmed.toLowerCase().includes('prohibit') ||
      trimmed.toLowerCase().includes('never claim') ||
      trimmed.toLowerCase().includes('must not')
    ) {
      // Extract quoted prohibited phrase if any
      const quoteMatch = trimmed.match(/"([^"]+)"|'([^']+)'/);
      const prohibitedPhrase = quoteMatch ? quoteMatch[1] || quoteMatch[2] : undefined;

      rules.push({
        id: `rule-parsed-${Date.now()}-${index}`,
        brandId,
        sourceDocId: docId,
        sourceDocTitle: docTitle,
        sourceDocVersion: 1,
        sourceExcerpt: trimmed,
        pageOrSection: currentSection,
        category: 'prohibited_claims',
        ruleDescription: trimmed.length > 80 ? trimmed.substring(0, 80) + '...' : trimmed,
        ruleType: prohibitedPhrase ? 'deterministic' : 'semantic',
        severity: 'critical',
        scope: 'all',
        detectionPattern: prohibitedPhrase,
        isActive: true,
        humanApprovalStatus: 'pending_review',
        createdAt: new Date().toISOString(),
      });
    } else if (trimmed.toLowerCase().includes('mandatory disclaimer') || trimmed.toLowerCase().includes('must include')) {
      const quoteMatch = trimmed.match(/"([^"]+)"|'([^']+)'/);
      const disclaimer = quoteMatch ? quoteMatch[1] || quoteMatch[2] : undefined;

      rules.push({
        id: `rule-parsed-${Date.now()}-${index}`,
        brandId,
        sourceDocId: docId,
        sourceDocTitle: docTitle,
        sourceDocVersion: 1,
        sourceExcerpt: trimmed,
        pageOrSection: currentSection,
        category: 'required_disclaimers',
        ruleDescription: 'Mandatory disclaimer requirement',
        ruleType: 'deterministic',
        severity: 'major',
        scope: 'all',
        detectionPattern: disclaimer,
        isActive: true,
        humanApprovalStatus: 'pending_review',
        createdAt: new Date().toISOString(),
      });
    }
  });

  return rules;
}
