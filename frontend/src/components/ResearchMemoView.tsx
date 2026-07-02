import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, TrendingUp, AlertTriangle, Target, DollarSign,
  Download, Share2, FileCode, FileType, Loader2, ChevronDown,
} from 'lucide-react';
import api from '@/lib/api';

interface MemoSection {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  content: string;
}

interface ExportAction {
  label: string;
  icon: React.ElementType;
  color: string;
}

interface DocumentOption {
  id: string;
  companyName: string;
  ticker?: string;
}

interface ResearchMemoViewProps {
  companyId?: string | null;
  documents?: DocumentOption[];
  onSelectDocument?: (id: string) => void;
}

const EXPORT_ACTIONS: ExportAction[] = [
  { label: 'Download PDF', icon: Download, color: '#4F8EF7' },
  { label: 'Copy Link', icon: Share2, color: '#6B8DD6' },
  { label: 'Export Markdown', icon: FileCode, color: '#A78BFA' },
  { label: 'Export JSON', icon: FileType, color: '#34D399' },
];

const SECTION_CONFIG: { id: string; title: string; icon: React.ElementType; color: string }[] = [
  { id: 'executiveSummary', title: 'Executive Summary', icon: FileText, color: '#4F8EF7' },
  { id: 'financialHealth', title: 'Financial Health', icon: DollarSign, color: '#34D399' },
  { id: 'growthDrivers', title: 'Growth Drivers', icon: TrendingUp, color: '#A78BFA' },
  { id: 'riskFactors', title: 'Risk Factors', icon: AlertTriangle, color: '#F59E0B' },
  { id: 'valuation', title: 'Valuation', icon: Target, color: '#6B8DD6' },
];

function parseMemoResult(text: string): MemoSection[] {
  const sections: MemoSection[] = [];
  for (const cfg of SECTION_CONFIG) {
    const escaped = cfg.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(
      `(?:^|\\n)${escaped}[：:\\s]+([\\s\\S]*?)(?=\\n(?:${SECTION_CONFIG.map(s => s.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})[：:\\s]|$)`,
      'i'
    );
    const match = text.match(regex);
    const content = match ? match[1].trim() : '';
    if (content) {
      sections.push({ ...cfg, content });
    }
  }
  if (sections.length === 0 && text.trim()) {
    sections.push({
      id: 'fullMemo',
      title: 'Full Memo',
      icon: FileText,
      color: '#4F8EF7',
      content: text.trim(),
    });
  }
  return sections;
}

export function ResearchMemoView({ companyId, documents = [], onSelectDocument }: ResearchMemoViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>('executiveSummary');
  const [exported, setExported] = useState<string | null>(null);
  const [sections, setSections] = useState<MemoSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickedDocId, setPickedDocId] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const memoCacheRef = useRef<Record<string, MemoSection[]>>({});

  useEffect(() => {
    if (!companyId) return;
    if (memoCacheRef.current[companyId]) {
      setSections(memoCacheRef.current[companyId]);
      return;
    }
    const fetchMemo = async () => {
      setLoading(true);
      try {
        const res = await api.post('/agent/sync/generate-memo', { companyId });
        const result = res.data?.memo_result || '';
        const parsed = parseMemoResult(result);
        memoCacheRef.current[companyId] = parsed;
        setSections(parsed);
      } catch {
        setSections([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMemo();
  }, [companyId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    if (pickerOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [pickerOpen]);

  const getFullMemoText = () => {
    return sections.map(s => `${s.title}\n\n${s.content}`).join('\n\n');
  };

  const downloadBlob = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = (label: string) => {
    setExported(label);
    const fullText = getFullMemoText();
    const company = 'ResearchMemo';

    if (label === 'Export JSON') {
      downloadBlob(
        JSON.stringify(sections, null, 2),
        `${company}.json`,
        'application/json',
      );
    } else if (label === 'Export Markdown') {
      downloadBlob(fullText, `${company}.md`, 'text/markdown');
    } else if (label === 'Download PDF') {
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${company}</title><style>
        body { font-family: Inter, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #222; }
        h1 { font-size: 22px; margin-top: 32px; margin-bottom: 8px; color: #111; }
        p { font-size: 14px; line-height: 1.6; margin: 8px 0; }
        ul { margin: 4px 0; padding-left: 20px; }
        li { font-size: 14px; line-height: 1.5; }
      </style></head><body>${sections.map(s =>
        `<h1>${s.title}</h1><p>${s.content.replace(/\n/g, '<br>')}</p>`
      ).join('')}</body></html>`;
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 500);
      }
    }

    setTimeout(() => setExported(null), 2000);
  };

  const pickedDoc = documents.find(d => d.id === pickedDocId);
  const hasData = sections.length > 0;

  return (
    <div
      className="rounded-[20px] border flex flex-col h-full overflow-hidden"
      style={{ backgroundColor: 'var(--ad-surface)', borderColor: 'var(--ad-border)' }}
    >
      {/* Header */}
      <div
        className="px-6 py-5 border-b shrink-0"
        style={{
          background: 'linear-gradient(135deg, var(--ad-accent-dim) 0%, transparent 70%)',
          borderColor: 'var(--ad-border)',
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-semibold mb-0.5" style={{ color: 'var(--ad-text-primary)' }}>
              Research Memo
            </h2>
            <p className="text-xs" style={{ color: 'var(--ad-text-muted)' }}>
              {hasData
                ? 'AI-generated research memo based on available data'
                : 'Select a document to generate a research memo'}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin" style={{ color: 'var(--ad-accent)' }} />
            <p className="font-semibold" style={{ color: 'var(--ad-text-primary)' }}>
              Generating research memo...
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--ad-text-muted)' }}>
              The AI agent is analyzing available data
            </p>
          </div>
        </div>
      ) : hasData ? (
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {/* Sections Accordion */}
          {sections.map((section) => {
            const isExpanded = expandedId === section.id;
            const Icon = section.icon;
            return (
              <div
                key={section.id}
                className="rounded-xl border overflow-hidden transition-all"
                style={{
                  backgroundColor: 'var(--ad-card)',
                  borderColor: 'var(--ad-border)',
                }}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : section.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  <Icon className="w-4 h-4 shrink-0" style={{ color: section.color }} />
                  <span className="text-sm font-medium flex-1" style={{ color: 'var(--ad-text-primary)' }}>
                    {section.title}
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    style={{ color: 'var(--ad-text-muted)' }}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: 'var(--ad-border)' }}>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--ad-text-secondary)' }}>
                      {section.content}
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {/* Export Actions */}
          <div className="flex gap-2 pt-2">
            {EXPORT_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => handleExport(action.label)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all"
                  style={{
                    backgroundColor: 'var(--ad-accent-dim)',
                    borderColor: 'var(--ad-border-accent)',
                    color: action.color,
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {exported === action.label ? 'Done!' : action.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="flex-1 flex items-center justify-center px-6">
          {documents.length > 0 ? (
            <div className="text-center max-w-sm">
              <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--ad-text-muted)' }} />
              <p className="text-sm font-medium mb-4" style={{ color: 'var(--ad-text-primary)' }}>
                Generate a research memo
              </p>
              {/* Document Picker */}
              <div className="relative mb-4" ref={pickerRef}>
                <button
                  onClick={() => setPickerOpen(p => !p)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border text-sm text-left"
                  style={{
                    backgroundColor: 'var(--ad-card)',
                    borderColor: 'var(--ad-border)',
                    color: pickedDoc ? 'var(--ad-text-primary)' : 'var(--ad-text-muted)',
                  }}
                >
                  <span className="truncate">{pickedDoc ? (pickedDoc.ticker ? `${pickedDoc.companyName} (${pickedDoc.ticker})` : pickedDoc.companyName) : 'Choose a document...'}</span>
                  <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${pickerOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--ad-text-muted)' }} />
                </button>
                {pickerOpen && (
                  <div
                    className="absolute z-20 mt-1 w-full rounded-xl border overflow-hidden"
                    style={{
                      backgroundColor: 'var(--ad-surface)',
                      borderColor: 'var(--ad-border)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    }}
                  >
                    {documents.map(doc => (
                      <button
                        key={doc.id}
                        onClick={() => { setPickedDocId(doc.id); setPickerOpen(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-all hover:opacity-80"
                        style={{
                          backgroundColor: pickedDocId === doc.id ? 'var(--ad-accent-dim)' : 'transparent',
                          color: 'var(--ad-text-primary)',
                        }}
                      >
                        <FileText className="w-4 h-4 shrink-0" style={{ color: 'var(--ad-accent)' }} />
                        <span className="truncate">{doc.companyName}</span>
                        {doc.ticker && (
                          <span className="text-xs ml-auto shrink-0" style={{ color: 'var(--ad-text-muted)' }}>{doc.ticker}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => pickedDocId && onSelectDocument?.(pickedDocId)}
                disabled={!pickedDocId}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: !pickedDocId ? 'var(--ad-card)' : 'linear-gradient(135deg, #4F8EF7, #6B8DD6)' }}
              >
                <FileText className="w-4 h-4" />
                Generate Research Memo
              </button>
            </div>
          ) : (
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--ad-text-muted)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--ad-text-primary)' }}>
                No research memo generated yet
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--ad-text-muted)' }}>
                Upload a document from the Documents tab to get started
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
