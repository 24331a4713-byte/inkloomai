/**
 * INKLOOM AI - Visual Brand Compliance Engine
 * Analyzes campaign visual assets (images, banners, artwork) against
 * brand color palettes, aspect ratios, logo requirements, and background restrictions.
 */

import { Brand, BrandRule, Finding, VisualAssetReport } from '../types';

export function runVisualComplianceAudit(
  imageMeta: {
    fileName?: string;
    width?: number;
    height?: number;
    dominantColors?: string[];
    hasLogo?: boolean;
    extractedText?: string;
  },
  rules: BrandRule[],
  brand: Brand
): VisualAssetReport {
  const visualFindings: Finding[] = [];
  const visualRules = rules.filter(
    (r) => r.isActive && r.humanApprovalStatus === 'approved' && (r.ruleType === 'visual' || r.category === 'color_rules' || r.category === 'logo_usage' || r.category === 'visual_identity')
  );

  const aspectRatio =
    imageMeta.width && imageMeta.height
      ? `${imageMeta.width}:${imageMeta.height}`
      : undefined;

  for (const rule of visualRules) {
    // 1. Prohibited Background Colors
    if (rule.category === 'color_rules' || rule.ruleDescription.toLowerCase().includes('background')) {
      const prohibitedColors = brand.visualPalette?.prohibitedBackgrounds || [];
      const patternColor = rule.detectionPattern?.toLowerCase() || '';

      const detected = imageMeta.dominantColors || [];
      for (const color of detected) {
        if (
          prohibitedColors.some((p) => p.toLowerCase() === color.toLowerCase()) ||
          (patternColor && color.toLowerCase().includes(patternColor))
        ) {
          visualFindings.push({
            id: `vis-${rule.id}-color`,
            ruleId: rule.id,
            ruleCategory: 'color_rules',
            ruleDescription: rule.ruleDescription,
            sourceDocId: rule.sourceDocId,
            sourceDocTitle: rule.sourceDocTitle,
            pageOrSection: rule.pageOrSection,
            sourceExcerpt: rule.sourceExcerpt,
            quotedText: `Prohibited background color detected: ${color}`,
            location: { startChar: 0, endChar: 0 },
            severity: rule.severity,
            explanation: `Artwork contains prohibited brand color "${color}". Guideline restriction applies.`,
            evidence: rule.sourceExcerpt,
            suggestedCorrection: `Replace with approved brand background (${brand.visualPalette?.primaryColor || '#FFFFFF'}).`,
            confidence: 'high',
            detectionMethod: 'visual',
            resolutionStatus: 'open',
          });
        }
      }
    }

    // 2. Logo Usage Requirements
    if (rule.category === 'logo_usage') {
      if (rule.ruleDescription.toLowerCase().includes('require') && imageMeta.hasLogo === false) {
        visualFindings.push({
          id: `vis-${rule.id}-logo-missing`,
          ruleId: rule.id,
          ruleCategory: 'logo_usage',
          ruleDescription: rule.ruleDescription,
          sourceDocId: rule.sourceDocId,
          sourceDocTitle: rule.sourceDocTitle,
          pageOrSection: rule.pageOrSection,
          sourceExcerpt: rule.sourceExcerpt,
          quotedText: '[Missing Required Brand Logo on Creative]',
          location: { startChar: 0, endChar: 0 },
          severity: rule.severity,
          explanation: 'Official brand logo is required on all external campaign graphics.',
          evidence: rule.sourceExcerpt,
          suggestedCorrection: 'Embed authorized brand logo in the upper or lower corner.',
          confidence: 'high',
          detectionMethod: 'visual',
          resolutionStatus: 'open',
        });
      }
    }

    // 3. Aspect Ratio Rules
    if (rule.category === 'visual_identity' && rule.ruleDescription.toLowerCase().includes('aspect ratio')) {
      const requiredRatios = brand.visualPalette?.requiredLogoAspectRatios || [];
      if (requiredRatios.length > 0 && aspectRatio && !requiredRatios.includes(aspectRatio)) {
        visualFindings.push({
          id: `vis-${rule.id}-aspect`,
          ruleId: rule.id,
          ruleCategory: 'visual_identity',
          ruleDescription: rule.ruleDescription,
          sourceDocId: rule.sourceDocId,
          sourceDocTitle: rule.sourceDocTitle,
          pageOrSection: rule.pageOrSection,
          sourceExcerpt: rule.sourceExcerpt,
          quotedText: `Creative aspect ratio ${aspectRatio}`,
          location: { startChar: 0, endChar: 0 },
          severity: rule.severity,
          explanation: `Image dimension ratio (${aspectRatio}) does not match approved channel ratios: ${requiredRatios.join(', ')}.`,
          evidence: rule.sourceExcerpt,
          suggestedCorrection: `Crop or re-render creative to ${requiredRatios[0] || '16:9'}.`,
          confidence: 'medium',
          detectionMethod: 'visual',
          resolutionStatus: 'open',
        });
      }
    }
  }

  return {
    hasImage: !!imageMeta.fileName,
    fileName: imageMeta.fileName,
    detectedColors: imageMeta.dominantColors,
    aspectRatioDetected: aspectRatio,
    hasLogoDetected: imageMeta.hasLogo,
    textExtractedFromImage: imageMeta.extractedText,
    visualFindings,
  };
}
