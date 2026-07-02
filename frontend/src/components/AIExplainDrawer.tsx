import React from 'react';
import { X, BookOpen, Calculator, BarChart2, Target, Lightbulb } from 'lucide-react';

export interface MetricExplainData {
  title: string;
  value: string;
  meaning: string;
  formula: string;
  benchmark: string;
  interpretation: string;
}

interface AIExplainDrawerProps {
  metric: MetricExplainData;
  onClose: () => void;
}

export function AIExplainDrawer({ metric, onClose }: AIExplainDrawerProps) {
  const sections = [
    { icon: BookOpen, label: 'What it means', content: metric.meaning },
    { icon: Calculator, label: 'Formula', content: metric.formula, mono: true },
    { icon: BarChart2, label: 'Industry Benchmark', content: metric.benchmark },
    { icon: Target, label: 'Interpretation', content: metric.interpretation },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 h-full z-50 w-[420px] flex flex-col overflow-hidden"
        style={{
          backgroundColor: 'var(--ad-surface)',
          borderLeft: '1px solid var(--ad-border)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 border-b flex items-start justify-between"
          style={{
            background: 'linear-gradient(135deg, var(--ad-accent-dim) 0%, transparent 60%)',
            borderColor: 'var(--ad-border)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4F8EF7, #6B8DD6)' }}
            >
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--ad-text-primary)' }}>
                AI Explain
              </h3>
              <p className="text-sm" style={{ color: 'var(--ad-text-muted)' }}>
                {metric.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ color: 'var(--ad-text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Value */}
        <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--ad-border)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--ad-text-muted)' }}>Current Value</p>
          <p className="text-3xl font-bold" style={{ color: 'var(--ad-accent)' }}>
            {metric.value}
          </p>
        </div>

        {/* Sections */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.label}
                className="rounded-2xl p-4 border"
                style={{ backgroundColor: 'var(--ad-card)', borderColor: 'var(--ad-border)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'var(--ad-accent-dim)' }}
                  >
                    <Icon className="w-4 h-4" style={{ color: 'var(--ad-accent)' }} />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--ad-text-primary)' }}>
                    {section.label}
                  </span>
                </div>
                <p
                  className={`text-sm leading-relaxed ${section.mono ? 'font-mono text-xs' : ''}`}
                  style={{
                    color: 'var(--ad-text-secondary)',
                    padding: section.mono ? '8px 12px' : undefined,
                    borderRadius: section.mono ? '8px' : undefined,
                    backgroundColor: section.mono ? 'var(--ad-card-deep)' : undefined,
                  }}
                >
                  {section.content}
                </p>
              </div>
            );
          })}

          {/* Analyst Note */}
          <div
            className="rounded-2xl p-4 border"
            style={{
              background: 'linear-gradient(135deg, var(--ad-accent-dim) 0%, transparent 100%)',
              borderColor: 'var(--ad-border-accent)',
            }}
          >
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--ad-accent)' }}>
              Analyst Note
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--ad-text-secondary)' }}>
              This metric is being analyzed in the context of NVIDIA's FY2024 annual report. All figures are sourced directly from SEC filings and represent audited financial data.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t" style={{ borderColor: 'var(--ad-border)' }}>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-medium text-white transition-all"
            style={{ backgroundColor: 'var(--ad-accent)' }}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
