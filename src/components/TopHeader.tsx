import React from 'react';
import { ShieldCheck, Play, Sparkles } from 'lucide-react';
import { Brand, Campaign } from '../types';
import { NavPage } from './Navigation';

interface TopHeaderProps {
  activePage: NavPage;
  selectedBrand: Brand | null;
  activeCampaign: Campaign | null;
  onRunAudit?: () => void;
  onOpenNewCompliance?: () => void;
  isAuditing?: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activePage,
  selectedBrand,
  activeCampaign,
  onRunAudit,
  onOpenNewCompliance,
  isAuditing = false,
}) => {
  const getPageTitle = (page: NavPage) => {
    switch (page) {
      case 'overview':
        return 'Executive Overview';
      case 'brands':
        return 'Brand Management';
      case 'guidelines':
        return 'Brand Guidelines & Rules';
      case 'campaigns':
        return 'Marketing Campaigns';
      case 'editor':
        return 'Content Editor & Workspace';
      case 'audit-results':
        return 'Compliance Audit Results';
      case 'review-approvals':
        return 'Review & Approvals';
      case 'history':
        return 'Audit Traceability Log';
      case 'settings':
        return 'Settings & Regression Tests';
      default:
        return 'Workspace';
    }
  };

  return (
    <header className="h-14 border-b border-stone-200 bg-white px-6 flex items-center justify-between gap-8 shrink-0">
      {/* Breadcrumb Trail */}
      <div className="flex items-center gap-2 text-xs text-stone-500 min-w-0">
        <span className="font-semibold text-stone-900 truncate">
          {selectedBrand?.name || 'No Brand Selected'}
        </span>
        <span className="text-stone-300">/</span>
        {activeCampaign && (
          <>
            <span className="text-stone-700 truncate">{activeCampaign.name}</span>
            <span className="text-stone-300">/</span>
          </>
        )}
        <span className="text-indigo-600 font-medium whitespace-nowrap">
          {getPageTitle(activePage)}
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 shrink-0">
        {onOpenNewCompliance && activePage !== 'editor' && (
          <button
            onClick={onOpenNewCompliance}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4338CA] hover:bg-[#3730A3] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Start a New Compliance</span>
          </button>
        )}

        {activePage === 'editor' && onRunAudit && (
          <button
            onClick={onRunAudit}
            disabled={isAuditing}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-[#4338CA] hover:bg-[#3730A3] disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            {isAuditing ? (
              <>
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>Auditing Draft...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Compliance Audit</span>
              </>
            )}
          </button>
        )}

        {/* Reviewer Profile */}
        <div className="flex items-center gap-2 pl-3 border-l border-stone-200">
          <img
            src="/src/assets/images/avatar_compliance_officer_1792893742916.jpg"
            alt="Lead Compliance Reviewer"
            referrerPolicy="no-referrer"
            className="w-7 h-7 rounded-full object-cover border border-stone-300 bg-stone-100"
          />
          <div className="text-left hidden sm:block">
            <div className="text-xs font-semibold text-stone-800 leading-none">
              Elena Vance
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">Compliance Director</div>
          </div>
        </div>
      </div>
    </header>
  );
};
