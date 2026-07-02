import React from 'react';
import { LayoutDashboard, FileText, Building2, Star } from 'lucide-react';

type TabType = 'chat' | 'documents' | 'analytics' | 'memo';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const navItems: Array<{ icon: React.ElementType; label: string; tab: TabType | null }> = [
  { icon: LayoutDashboard, label: 'Research Jobs', tab: 'chat' },
  { icon: FileText, label: 'Documents', tab: 'documents' },
  { icon: Building2, label: 'Companies', tab: 'analytics' },
  { icon: Star, label: 'Watchlist', tab: 'analytics' },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const activeNavItem = navItems.find(n => n.tab === activeTab);

  return (
    <div
      className="w-60 h-screen flex flex-col shrink-0 border-r"
      style={{ backgroundColor: 'var(--ad-surface)', borderColor: 'var(--ad-border)' }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--ad-border)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #4F8EF7, #6B8DD6)',
              boxShadow: '0 4px 16px rgba(79,142,247,0.35)',
            }}
          >
            <img src="/venorse-icon.svg"
              alt="Venorse"
              className="w-8 h-8"/>
          </div>
          <div>
            <h1 className="font-['Michroma'] tracking-tight" style={{ color: 'var(--ad-text-primary)', fontSize: '16px' }}>
              VENORSE
            </h1>
            <p className="text-xs" style={{ color: 'var(--ad-text-muted)' }}>
              Financial Intelligence
            </p>
          </div>
        </div>
      </div>

      {/* Section Label */}
      <div className="px-5 pt-5 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--ad-text-muted)' }}>
          Workspace
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pb-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.tab !== null && activeTab === item.tab && activeNavItem?.tab === item.tab;
          const isCurrentSection = item.tab !== null && activeTab === item.tab;

          return (
            <button
              key={item.label}
              onClick={() => item.tab && onTabChange(item.tab)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group"
              style={{
                backgroundColor: isCurrentSection ? 'var(--ad-accent-dim)' : 'transparent',
                border: isCurrentSection ? '1px solid var(--ad-border-accent)' : '1px solid transparent',
              }}
            >
              <Icon
                className="w-4 h-4 shrink-0"
                style={{ color: isCurrentSection ? 'var(--ad-accent)' : 'var(--ad-text-muted)' }}
              />
              <span
                className="text-sm font-medium flex-1 text-left"
                style={{ color: isCurrentSection ? 'var(--ad-text-primary)' : 'var(--ad-text-secondary)' }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>


    </div>
  );
}
