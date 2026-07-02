import React from 'react';
import { FileText, CheckCircle2, Loader2, Clock, Cpu, Check } from 'lucide-react';

export interface DocumentCardProps {
  id: string;
  companyName: string;
  ticker: string;
  filingType: string;
  uploadDate: string;
  pagesIndexed: number;
  embeddingStatus: 'complete' | 'processing' | 'pending';
  hasSnapshot?: boolean;
  onSelect?: (id: string) => void;
  selected?: boolean;
}

const statusConfig = {
  complete: {
    label: 'Indexed',
    icon: CheckCircle2,
    color: 'var(--ad-success)',
    bg: 'var(--ad-success-dim)',
  },
  processing: {
    label: 'Processing',
    icon: Loader2,
    color: 'var(--ad-accent)',
    bg: 'var(--ad-accent-dim)',
  },
  pending: {
    label: 'Queued',
    icon: Clock,
    color: 'var(--ad-warning)',
    bg: 'var(--ad-warning-dim)',
  },
};

export function DocumentCard({
  id,
  companyName,
  ticker,
  filingType,
  uploadDate,
  pagesIndexed,
  embeddingStatus,
  onSelect,
  selected,
}: DocumentCardProps) {
  const status = statusConfig[embeddingStatus];
  const StatusIcon = status.icon;
  const isProcessing = embeddingStatus === 'processing';

  return (
    <div
      className="rounded-2xl border transition-all duration-200 overflow-hidden group relative"
      style={{
        backgroundColor: 'var(--ad-surface)',
        borderColor: selected ? 'var(--ad-accent)' : 'var(--ad-border)',
        boxShadow: selected ? '0 0 0 1px var(--ad-accent), var(--ad-shadow)' : 'none',
        cursor: onSelect ? 'pointer' : 'default',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = selected ? 'var(--ad-accent)' : 'var(--ad-border-accent)';
        (e.currentTarget as HTMLElement).style.boxShadow = selected ? '0 0 0 1px var(--ad-accent), var(--ad-shadow)' : 'var(--ad-shadow)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = selected ? 'var(--ad-accent)' : 'var(--ad-border)';
        if (!selected) (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        else (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 1px var(--ad-accent), var(--ad-shadow)';
      }}
      onClick={() => onSelect?.(id)}
    >
      {/* Selected badge */}
      {selected && (
        <div
          className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium z-10"
          style={{ backgroundColor: 'var(--ad-success-dim)', color: 'var(--ad-success)' }}
        >
          <Check className="w-3 h-3" />
          Selected
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3.5">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'var(--ad-accent-dim)', border: '1px solid var(--ad-border-accent)' }}
            >
              <FileText className="w-6 h-6" style={{ color: 'var(--ad-accent)' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold" style={{ color: 'var(--ad-text-primary)' }}>
                  {companyName}
                </h4>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--ad-card)', color: 'var(--ad-text-muted)' }}
                >
                  {ticker}
                </span>
              </div>
              <p className="text-sm mt-0.5" style={{ color: 'var(--ad-text-secondary)' }}>
                {filingType}
              </p>
            </div>
          </div>

          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: status.bg, color: status.color }}
          >
            <StatusIcon className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            {status.label}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-4 border-t" style={{ borderColor: 'var(--ad-border)' }}>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--ad-text-muted)' }}>Upload Date</p>
            <p className="text-sm font-medium" style={{ color: 'var(--ad-text-primary)' }}>{uploadDate}</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--ad-text-muted)' }}>Pages Indexed</p>
            <p className="text-sm font-medium" style={{ color: 'var(--ad-text-primary)' }}>{pagesIndexed}</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--ad-text-muted)' }}>Embeddings</p>
            <div className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5" style={{ color: status.color }} />
              <p className="text-sm font-medium" style={{ color: status.color }}>{status.label}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div
        className="px-5 py-3 border-t flex items-center justify-between"
        style={{ backgroundColor: 'var(--ad-card)', borderColor: 'var(--ad-border)' }}
      >
        <div className="flex items-center gap-2">
          {isProcessing && (
            <>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <div
                    key={i}
                    className="h-1 w-6 rounded-full transition-all"
                    style={{
                      backgroundColor: i <= 3 ? 'var(--ad-accent)' : 'var(--ad-border)',
                    }}
                  />
                ))}
              </div>
              <span className="text-xs" style={{ color: 'var(--ad-text-muted)' }}>Parsing document...</span>
            </>
          )}
          {embeddingStatus === 'complete' && (
            <span className="text-xs" style={{ color: selected ? 'var(--ad-accent)' : 'var(--ad-text-muted)' }}>
              {selected ? 'Selected for AI analysis' : 'Ready for AI analysis'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
