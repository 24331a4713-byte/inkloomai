import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  PieChart,
  Activity,
  Award,
  AlertTriangle,
} from 'lucide-react';
import { AuditRun, Campaign, Brand, BrandRule } from '../types';
import { NavPage } from './Navigation';

interface AnalyticsViewProps {
  brand: Brand | null;
  audits: AuditRun[];
  campaigns: Campaign[];
  rules: BrandRule[];
  setActivePage: (page: NavPage) => void;
  onSelectAudit: (audit: AuditRun) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  brand,
  audits,
  campaigns,
  rules,
  setActivePage,
  onSelectAudit,
}) => {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('all');
  const [hoveredPoint, setHoveredPoint] = useState<AuditRun | null>(null);

  if (!brand) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-3">
        <h2 className="text-base font-semibold text-stone-800">No brand selected</h2>
        <p className="text-xs text-stone-500">Select an active brand to view compliance analytics.</p>
      </div>
    );
  }

  // Filter audits for this brand
  const brandAudits = useMemo(() => {
    return audits
      .filter((a) => a.brandId === brand.id)
      .filter((a) => selectedCampaignId === 'all' || a.campaignId === selectedCampaignId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [audits, brand.id, selectedCampaignId]);

  // Statistics calculation from actual stored audits
  const totalAudits = brandAudits.length;
  const scoredAudits = brandAudits.filter((a) => a.scoreCalculation.complianceScore !== null);
  const avgScore =
    scoredAudits.length > 0
      ? Math.round(
          scoredAudits.reduce((acc, a) => acc + (a.scoreCalculation.complianceScore || 0), 0) /
            scoredAudits.length
        )
      : 0;

  const latestScore =
    scoredAudits.length > 0 ? scoredAudits[scoredAudits.length - 1].scoreCalculation.complianceScore : null;

  const previousScore =
    scoredAudits.length > 1 ? scoredAudits[scoredAudits.length - 2].scoreCalculation.complianceScore : null;

  const scoreDelta =
    latestScore !== null && previousScore !== null ? latestScore - previousScore : 0;

  // Zero-critical audit rate
  const cleanAudits = brandAudits.filter(
    (a) => a.scoreCalculation.criticalCount === 0 && a.validatedFindings.length === 0
  ).length;
  const cleanRate = totalAudits > 0 ? Math.round((cleanAudits / totalAudits) * 100) : 0;

  // Category breakdown
  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const audit of brandAudits) {
      for (const finding of audit.validatedFindings) {
        const cat = finding.ruleCategory || 'other';
        map.set(cat, (map.get(cat) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([category, count]) => ({
        category: category.replace(/_/g, ' '),
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [brandAudits]);

  const totalViolations = categoryCounts.reduce((acc, c) => acc + c.count, 0);

  // Severity counts
  const severityCounts = useMemo(() => {
    let critical = 0;
    let major = 0;
    let minor = 0;
    for (const audit of brandAudits) {
      for (const finding of audit.validatedFindings) {
        if (finding.severity === 'critical') critical++;
        else if (finding.severity === 'major') major++;
        else if (finding.severity === 'minor') minor++;
      }
    }
    return { critical, major, minor };
  }, [brandAudits]);

  // Brand Health Score (Composite Index: 0 - 100)
  const activeRulesCount = rules.filter(
    (r) => r.brandId === brand.id && r.isActive && r.humanApprovalStatus === 'approved'
  ).length;

  const brandHealthScore = useMemo(() => {
    if (totalAudits === 0) return 70; // Baseline before audits
    // Weighted combination: 50% avg compliance + 30% clean rate + 20% active rule coverage
    const ruleFactor = Math.min(100, activeRulesCount * 12);
    const health = Math.round(avgScore * 0.5 + cleanRate * 0.3 + ruleFactor * 0.2);
    return Math.max(10, Math.min(100, health));
  }, [totalAudits, avgScore, cleanRate, activeRulesCount]);

  // SVG Chart dimensions & points
  const chartHeight = 200;
  const chartWidth = 700;
  const paddingX = 40;
  const paddingY = 30;

  const points = useMemo(() => {
    if (scoredAudits.length === 0) return [];
    if (scoredAudits.length === 1) {
      const a = scoredAudits[0];
      const y =
        chartHeight -
        paddingY -
        ((a.scoreCalculation.complianceScore || 0) / 100) * (chartHeight - 2 * paddingY);
      return [{ x: chartWidth / 2, y, audit: a, score: a.scoreCalculation.complianceScore || 0 }];
    }

    const usableWidth = chartWidth - 2 * paddingX;
    const step = usableWidth / (scoredAudits.length - 1);

    return scoredAudits.map((a, i) => {
      const score = a.scoreCalculation.complianceScore || 0;
      const x = paddingX + i * step;
      const y = chartHeight - paddingY - (score / 100) * (chartHeight - 2 * paddingY);
      return { x, y, audit: a, score };
    });
  }, [scoredAudits]);

  const svgPolyline = points.map((p) => `${p.x},${p.y}`).join(' ');
  const svgArea =
    points.length > 1
      ? `${points[0].x},${chartHeight - paddingY} ${svgPolyline} ${
          points[points.length - 1].x
        },${chartHeight - paddingY}`
      : '';

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 uppercase tracking-wider">
            <span>{brand.name}</span>
            <span>·</span>
            <span>Executive Governance Intelligence</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight mt-1">
            Compliance Analytics & Brand Health
          </h1>
          <p className="text-xs text-stone-500 mt-1 max-w-2xl leading-relaxed">
            Real-time telemetry aggregated from actual audit executions, human sign-offs, and rule violation history.
          </p>
        </div>

        {/* Campaign Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-stone-500 font-medium">Campaign:</label>
          <select
            value={selectedCampaignId}
            onChange={(e) => setSelectedCampaignId(e.target.value)}
            className="px-3 py-1.5 border border-stone-200 rounded-lg text-xs bg-white text-stone-700 focus:outline-none"
          >
            <option value="all">All Campaigns</option>
            {campaigns
              .filter((c) => c.brandId === brand.id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Brand Health Index */}
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>Brand Health Index</span>
            <Award className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-stone-900">{brandHealthScore}</span>
            <span className="text-xs font-bold text-stone-400">/ 100</span>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                brandHealthScore >= 80
                  ? 'bg-emerald-500'
                  : brandHealthScore >= 60
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${brandHealthScore}%` }}
            />
          </div>
        </div>

        {/* Average Compliance Score */}
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>Average Compliance</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-stone-900">{avgScore}%</span>
            {scoreDelta !== 0 && (
              <span
                className={`text-[11px] font-semibold flex items-center ${
                  scoreDelta > 0 ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {scoreDelta > 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {scoreDelta > 0 ? `+${scoreDelta}%` : `${scoreDelta}%`}
              </span>
            )}
          </div>
          <span className="text-[11px] text-stone-400 mt-1 block">Across {totalAudits} audit runs</span>
        </div>

        {/* Clean Audit Rate */}
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>Zero-Violation Rate</span>
            <Activity className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-stone-900">{cleanRate}%</span>
          </div>
          <span className="text-[11px] text-stone-400 mt-1 block">
            {cleanAudits} of {totalAudits} audits perfectly compliant
          </span>
        </div>

        {/* Total Active Rules */}
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>Enforced Rule Matrix</span>
            <Layers className="w-4 h-4 text-stone-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-stone-900">{activeRulesCount}</span>
            <span className="text-xs text-stone-500">rules</span>
          </div>
          <span className="text-[11px] text-stone-400 mt-1 block">Isolated to {brand.name}</span>
        </div>
      </div>

      {/* COMPLIANCE TREND CHART (SVG) */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Compliance Score Trajectory</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Historical progression of compliance scores across draft revisions.
            </p>
          </div>

          {hoveredPoint && (
            <div className="px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-mono text-indigo-900 flex items-center gap-2">
              <span>Score: <strong>{hoveredPoint.scoreCalculation.complianceScore}%</strong></span>
              <span>·</span>
              <span>Draft v{hoveredPoint.draftVersion}</span>
              <span>·</span>
              <span>{new Date(hoveredPoint.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}
        </div>

        {points.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-stone-400 text-xs">
            <BarChart3 className="w-6 h-6 mb-2 text-stone-300" />
            <span>No scored audits recorded yet for this filter. Run an audit to start telemetry.</span>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-48 select-none overflow-visible"
            >
              <defs>
                <linearGradient id="gradientArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4338CA" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#4338CA" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line
                x1={paddingX}
                y1={paddingY}
                x2={chartWidth - paddingX}
                y2={paddingY}
                stroke="#E7E5E4"
                strokeDasharray="4 4"
              />
              <text x={10} y={paddingY + 4} className="text-[10px] fill-stone-400 font-mono">
                100%
              </text>

              <line
                x1={paddingX}
                y1={chartHeight / 2}
                x2={chartWidth - paddingX}
                y2={chartHeight / 2}
                stroke="#E7E5E4"
                strokeDasharray="4 4"
              />
              <text x={10} y={chartHeight / 2 + 4} className="text-[10px] fill-stone-400 font-mono">
                50%
              </text>

              <line
                x1={paddingX}
                y1={chartHeight - paddingY}
                x2={chartWidth - paddingX}
                y2={chartHeight - paddingY}
                stroke="#E7E5E4"
              />
              <text x={10} y={chartHeight - paddingY + 4} className="text-[10px] fill-stone-400 font-mono">
                0%
              </text>

              {/* Shaded Area */}
              {svgArea && <polygon points={svgArea} fill="url(#gradientArea)" />}

              {/* Score Line */}
              {points.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#4338CA"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={svgPolyline}
                />
              )}

              {/* Interactive Data Points */}
              {points.map((p, idx) => (
                <g key={idx}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={hoveredPoint?.id === p.audit.id ? 6 : 4}
                    className="cursor-pointer transition-all fill-white stroke-[#4338CA] stroke-2 hover:r-7"
                    onMouseEnter={() => setHoveredPoint(p.audit)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    onClick={() => onSelectAudit(p.audit)}
                  />
                  {/* Point Label */}
                  <text
                    x={p.x}
                    y={p.y - 10}
                    textAnchor="middle"
                    className="text-[10px] font-bold fill-stone-700 font-mono pointer-events-none"
                  >
                    {p.score}%
                  </text>
                </g>
              ))}
            </svg>
          </div>
        )}
      </div>

      {/* TWO-COLUMN BREAKDOWN: VIOLATIONS & SEVERITY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Category Breakdown (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <span>Violation Category Distribution</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Breakdown of detected governance non-compliances by rule category.
              </p>
            </div>
            <span className="text-xs font-bold text-stone-400 font-mono">
              Total: {totalViolations}
            </span>
          </div>

          {categoryCounts.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-400">
              No violations recorded in the selected dataset.
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {categoryCounts.map((item, idx) => {
                const percentage =
                  totalViolations > 0 ? Math.round((item.count / totalViolations) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-stone-800 capitalize">{item.category}</span>
                      <span className="font-mono text-stone-500 text-[11px]">
                        {item.count} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Severity Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-600" />
              <span>Severity Classification</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Distribution of risk levels across historical audits.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {/* Critical */}
            <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-red-600 shrink-0" />
                <div>
                  <span className="font-bold text-xs text-red-950 block">Critical</span>
                  <span className="text-[10px] text-red-700">Blocks release unconditionally</span>
                </div>
              </div>
              <span className="text-xl font-bold font-mono text-red-900">
                {severityCounts.critical}
              </span>
            </div>

            {/* Major */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-amber-600 shrink-0" />
                <div>
                  <span className="font-bold text-xs text-amber-950 block">Major</span>
                  <span className="text-[10px] text-amber-700">Requires reviewer sign-off</span>
                </div>
              </div>
              <span className="text-xl font-bold font-mono text-amber-900">
                {severityCounts.major}
              </span>
            </div>

            {/* Minor */}
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-stone-500 shrink-0" />
                <div>
                  <span className="font-bold text-xs text-stone-900 block">Minor</span>
                  <span className="text-[10px] text-stone-500">Stylistic & editorial advisory</span>
                </div>
              </div>
              <span className="text-xl font-bold font-mono text-stone-800">
                {severityCounts.minor}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
