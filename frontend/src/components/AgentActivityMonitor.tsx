import React, { useState } from 'react';
import { CheckCircle2, Clock, Loader2, ChevronDown, ChevronUp, Terminal, PanelRightClose } from 'lucide-react';

export interface AgentStep {
  id: string;
  label: string;
  status: 'complete' | 'active' | 'pending';
  detail?: string;
  timestamp?: string;
}

interface AgentActivityMonitorProps {
  steps: AgentStep[];
  onToggle?: () => void;
}

const statusConfig = {
  complete: {
    icon: CheckCircle2,
    color: 'var(--ad-success)',
    bg: 'var(--ad-success-dim)',
    border: '#3FB68B30',
  },
  active: {
    icon: Loader2,
    color: 'var(--ad-accent)',
    bg: 'var(--ad-accent-dim)',
    border: 'var(--ad-border-accent)',
  },
  pending: {
    icon: Clock,
    color: 'var(--ad-text-muted)',
    bg: 'var(--ad-card)',
    border: 'var(--ad-border)',
  },
};

export function AgentActivityMonitor({ steps, onToggle }: AgentActivityMonitorProps) {
  const [expandedId, setExpandedId] = useState<string | null>('5');

  const completedCount = steps.filter(s => s.status === 'complete').length;
  const progress = (completedCount / steps.length) * 100;
  const activeStep = steps.find(s => s.status === 'active');

  return (
    <div
      className="rounded-[20px] border flex flex-col h-full overflow-hidden"
      style={{ backgroundColor: 'var(--ad-surface)', borderColor: 'var(--ad-border)' }}
    >
      {/* Header */}
      <div
        className="px-5 py-5 border-b shrink-0"
        style={{
          background: 'linear-gradient(135deg, var(--ad-accent-dim) 0%, transparent 70%)',
          borderColor: 'var(--ad-border)',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--ad-text-primary)' }}>
              Agent Activity
            </h3>
            <p className="text-xs" style={{ color: 'var(--ad-text-muted)' }}>
              Live Workflow Execution
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            {activeStep && (
              <>
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: 'var(--ad-accent)' }}
                />
                <span className="text-xs" style={{ color: 'var(--ad-accent)' }}>Running</span>
              </>
            )}
            {onToggle && (
              <button
                onClick={onToggle}
                className="ml-1 p-1 rounded-lg transition-all hover:opacity-70"
                style={{ color: 'var(--ad-text-muted)' }}
                title="Collapse panel"
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between mb-1.5">
            <span className="text-xs" style={{ color: 'var(--ad-text-muted)' }}>
              Workflow Progress
            </span>
            <span className="text-xs font-medium" style={{ color: 'var(--ad-text-primary)' }}>
              {completedCount}/{steps.length} steps
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--ad-card)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progress}%`,
                backgroundColor: 'var(--ad-progress-fill)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {steps.map((step, index) => {
          const cfg = statusConfig[step.status];
          const Icon = cfg.icon;
          const isExpanded = expandedId === step.id;
          const isActive = step.status === 'active';

          return (
            <div key={step.id} className="relative">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className="absolute left-5 top-full w-px h-2 z-10"
                  style={{ backgroundColor: steps[index + 1].status !== 'pending' ? 'var(--ad-success)' : 'var(--ad-border)' }}
                />
              )}

              <div
                className="rounded-2xl border overflow-hidden transition-all duration-200"
                style={{
                  backgroundColor: cfg.bg,
                  borderColor: cfg.border,
                  boxShadow: isActive ? '0 0 20px var(--ad-accent-glow)' : 'none',
                }}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : step.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 ${isActive ? 'animate-spin' : ''}`}
                    style={{ color: cfg.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--ad-text-primary)' }}>
                      {step.label}
                    </p>
                    {step.timestamp && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--ad-text-muted)' }}>
                        {step.timestamp}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {step.detail && (
                      <div style={{ color: 'var(--ad-text-muted)' }}>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    )}
                  </div>
                </button>

                {/* Expanded Detail */}
                {isExpanded && step.detail && (
                  <div
                    className="px-4 pb-4 pt-1 border-t"
                    style={{ borderColor: cfg.border }}
                  >
                    <div
                      className="flex items-start gap-2 p-3 rounded-xl"
                      style={{ backgroundColor: 'var(--ad-card-deep)' }}
                    >
                      <Terminal className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--ad-text-muted)' }} />
                      <p className="text-xs leading-relaxed font-mono" style={{ color: 'var(--ad-text-secondary)' }}>
                        {step.detail}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="px-5 py-4 border-t shrink-0" style={{ borderColor: 'var(--ad-border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--ad-text-primary)' }}>
              Estimated completion
            </p>
            <p className="text-xs" style={{ color: 'var(--ad-text-muted)' }}>
              ~2 minutes remaining
            </p>
          </div>
          <button
            className="text-xs px-3 py-2 rounded-xl border font-medium transition-all"
            style={{
              backgroundColor: 'var(--ad-accent-dim)',
              borderColor: 'var(--ad-border-accent)',
              color: 'var(--ad-accent)',
            }}
          >
            View All Logs
          </button>
        </div>
      </div>
    </div>
  );
}
