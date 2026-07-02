import React, { useState } from 'react';
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, Rocket, Users, BarChart2, ChevronDown, ChevronUp } from 'lucide-react';

interface AISnapshotCardProps {
  companyName: string;
  ticker: string;
}

export function AISnapshotCard({ companyName, ticker }: AISnapshotCardProps) {
  const [expanded, setExpanded] = useState(false);

  const metrics: { label: string; value: string; trend: 'up' | 'down' }[] = [];

  const risks: string[] = [];
  const drivers: string[] = [];

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all duration-300"
      style={{
        backgroundColor: 'var(--ad-surface)',
        borderColor: 'var(--ad-border-accent)',
        boxShadow: '0 0 0 1px var(--ad-accent-dim), var(--ad-shadow)',
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between border-b"
        style={{ background: 'linear-gradient(135deg, var(--ad-accent-dim) 0%, transparent 100%)', borderColor: 'var(--ad-border)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #4F8EF7, #6B8DD6)' }}
          >
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold" style={{ color: 'var(--ad-text-primary)' }}>
                AI Snapshot
              </span>
              {ticker && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: 'var(--ad-accent-dim)', color: 'var(--ad-accent)' }}
                >
                  {ticker}
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ad-text-muted)' }}>
              {companyName}
            </p>
          </div>
        </div>
      </div>

      {/* Empty State */}
      <div className="px-5 py-8 text-center">
        <p className="text-sm" style={{ color: 'var(--ad-text-muted)' }}>
          No AI snapshot available. Upload and process a document to generate insights.
        </p>
      </div>
    </div>
  );
}
