import React from 'react';
import {
  LayoutDashboard,
  Building2,
  BookOpenCheck,
  Megaphone,
  FileEdit,
  ShieldAlert,
  ClipboardCheck,
  History,
  Settings,
  Sparkles,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { Brand } from '../types';

export type NavPage =
  | 'overview'
  | 'brands'
  | 'guidelines'
  | 'campaigns'
  | 'editor'
  | 'audit-results'
  | 'review-approvals'
  | 'history'
  | 'settings';

interface NavigationProps {
  activePage: NavPage;
  setActivePage: (page: NavPage) => void;
  brands: Brand[];
  selectedBrand: Brand | null;
  onSelectBrand: (brand: Brand) => void;
  onOpenOnboarding: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activePage,
  setActivePage,
  brands,
  selectedBrand,
  onSelectBrand,
  onOpenOnboarding,
  isCollapsed,
  setIsCollapsed,
}) => {
  const navItems: { id: NavPage; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'brands', label: 'Brands', icon: Building2 },
    { id: 'guidelines', label: 'Brand Guidelines', icon: BookOpenCheck },
    { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
    { id: 'editor', label: 'Content Editor', icon: FileEdit },
    { id: 'audit-results', label: 'Audit Results', icon: ShieldAlert },
    { id: 'review-approvals', label: 'Review & Approvals', icon: ClipboardCheck },
    { id: 'history', label: 'Audit History', icon: History },
    { id: 'settings', label: 'Settings & Tests', icon: Settings },
  ];

  return (
    <aside
      className={`bg-white border-r border-stone-200 flex flex-col h-screen shrink-0 select-none transition-all duration-200 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className={`border-b border-stone-200 ${isCollapsed ? 'p-3 text-center' : 'p-4'}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded bg-[#4338CA] flex items-center justify-center text-white font-bold text-sm tracking-wider shadow-sm shrink-0">
              IK
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-bold text-stone-900 tracking-tight leading-none truncate">
                  INKLOOM AI
                </h1>
                <p className="text-[11px] text-stone-500 mt-1 truncate">
                  Brand Governance & QA
                </p>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Active Brand Selector with Strict Isolation */}
        {!isCollapsed && (
          <div className="mt-4">
            <label className="text-[10px] font-semibold tracking-wider uppercase text-stone-400 mb-1.5 block">
              Governing Brand
            </label>
            <div className="relative">
              <select
                value={selectedBrand?.id || ''}
                onChange={(e) => {
                  const b = brands.find((brand) => brand.id === e.target.value);
                  if (b) onSelectBrand(b);
                }}
                className="w-full appearance-none bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 pr-8 text-xs font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 truncate cursor-pointer"
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.isDemo ? '(Demo)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {selectedBrand?.isDemo && (
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50/80 px-2 py-0.5 rounded border border-amber-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span className="font-medium">Demo workspace</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Navigation Links */}
      <nav className={`flex-1 overflow-y-auto space-y-1 ${isCollapsed ? 'px-2 py-3' : 'px-3 py-4'}`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-lg text-xs font-medium transition-colors ${
                isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2 text-left'
              } ${
                isActive
                  ? 'bg-indigo-50/80 text-indigo-900 font-semibold'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-indigo-600' : 'text-stone-400'
                }`}
              />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom Assistance & Onboarding */}
      <div className={`border-t border-stone-200 bg-stone-50/60 ${isCollapsed ? 'p-2' : 'p-3'}`}>
        <button
          onClick={onOpenOnboarding}
          title="Guided Onboarding"
          className={`w-full flex items-center justify-center text-xs font-medium text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-100 transition-colors shadow-2xs ${
            isCollapsed ? 'p-2' : 'gap-2 px-3 py-2'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          {!isCollapsed && <span>Interactive Guide</span>}
        </button>
        {!isCollapsed && (
          <div className="mt-2 text-[10px] text-stone-400 text-center">
            Inkloom Engine v2.4
          </div>
        )}
      </div>
    </aside>
  );
};
