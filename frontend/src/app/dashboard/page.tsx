"use client"
import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { AIResearchChat } from '@/components/AIResearchChat';
import { AgentActivityMonitor, AgentStep } from '@/components/AgentActivityMonitor';
import { DocumentCard, DocumentCardProps } from '@/components/DocumentCard';
import { FinancialWidget } from '@/components/FinancialWidget';
import { AIExplainDrawer, MetricExplainData } from '@/components/AIExplainDrawer';
import { CompanyComparison } from '@/components/CompanyComparison';
import { ResearchMemoView } from '@/components/ResearchMemoView';
import { ThemeContext } from '@/context/ThemeContext';
import api from '@/lib/api';
import { Upload, Plus, Loader2, BarChart3, PanelRightOpen } from 'lucide-react';

export type TabType = 'chat' | 'documents' | 'analytics' | 'memo';

const JOB_TYPE_LABELS: Record<string, string> = {
  document_summary: 'Document Processing',
  financial_analysis: 'Financial Analysis',
  comparison: 'Company Comparison',
  research_memo: 'Research Memo Generation',
};

const JOB_STATUS_MAP: Record<string, 'complete' | 'active' | 'pending'> = {
  completed: 'complete',
  processing: 'active',
  pending: 'pending',
  failed: 'pending',
};

export default function DashboardPage() {
  const [isDark, setIsDark] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [explainMetric, setExplainMetric] = useState<MetricExplainData | null>(null);
  const [documents, setDocuments] = useState<DocumentCardProps[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<{
    title: string;
    value: string;
    change: string;
    trend: 'up' | 'down';
    chartType: 'area' | 'line' | 'bar';
    data: { value: number }[];
    explain: MetricExplainData;
  }[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [agentPanelOpen, setAgentPanelOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const metricsCacheRef = useRef<Record<string, typeof metrics>>({});

  const selectedDoc = documents.find(d => d.id === selectedDocId);

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/documents');
      const docs: DocumentCardProps[] = (Array.isArray(res.data) ? res.data : (res.data.documents || [])).map((doc: any) => ({
        id: doc._id || doc.id,
        companyName: doc.companyId?.name || doc.originalName || 'Untitled',
        ticker: doc.companyId?.ticker || '',
        filingType: doc.fileType === 'application/pdf' ? 'PDF Document' : doc.fileType || 'Document',
        uploadDate: doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown',
        pagesIndexed: doc.pagesIndexed || 0,
        embeddingStatus: ({ uploaded: 'pending', processing: 'processing', completed: 'complete', failed: 'pending' } as Record<string, 'complete' | 'processing' | 'pending'>)[doc.status] || 'pending',
        onSelect: handleSelectDocument,
        selected: doc._id === selectedDocId || doc.id === selectedDocId,
      }));
      setDocuments(docs);
    } catch {
      setDocuments([]);
    }
  };

  const handleSelectDocument = (id: string) => {
    setSelectedDocId(prev => prev === id ? null : id);
  };

  const fetchMetrics = async () => {
    setMetricsLoading(true);
    setMetricsError(null);
    // Validate prerequisites
    if (!selectedDocId) {
      setMetricsError("No document selected");
      setMetrics([]);
      setMetricsLoading(false);
      return;
    }

    if (!selectedDoc) {
      setMetricsError("Selected document not found");
      setMetrics([]);
      setMetricsLoading(false);
      return;
    }

    try {
      const res = await api.post('/agent/financial-metrics', {
        companyId: selectedDocId,
        companyName: selectedDoc.companyName || ''
      });

      // Check for API-level errors
      if (!res.data) {
        setMetricsError('Empty response from server');
        setMetrics([]);
        return;
      }

      // Check for agent-level errors
      const { error, metrics, analysis_text } = res.data;

      if (error && error.trim()) {
        const errorMsg = error.startsWith('[OpenRouter API error:')
          ? 'LLM API is temporarily unavailable. Please try again later.'
          : error;
        setMetricsError(errorMsg);
        setMetrics([]);
        return;
      }

      // Check if metrics array is valid
      if (!Array.isArray(metrics)) {
        setMetricsError('Invalid metrics format from server');
        setMetrics([]);
        return;
      }

      // Map metrics with validation
      const mapped = metrics.map((m: any) => {
        const required = ['title', 'value', 'change', 'trend', 'chartType', 'data', 'explain'];
        const hasAllFields = required.every(field => field in m);

        if (!hasAllFields) {
          console.warn('Metric missing fields:', m);
          return null;
        }

        return {
          title: m.title,
          value: m.value,
          change: m.change,
          trend: m.trend as 'up' | 'down',
          chartType: m.chartType as 'area' | 'line' | 'bar',
          data: m.data || [],
          explain: m.explain as MetricExplainData,
        };
      }).filter((m: any) => m !== null);

      if (mapped.length === 0) {
        setMetricsError(analysis_text || 'No metrics could be extracted from the document. Ensure it contains financial statements.');
        setMetrics([]);
        return;
      }

      // Cache and set
      if (selectedDocId) {
        metricsCacheRef.current[selectedDocId] = mapped;
      }
      setMetrics(mapped);
    } catch (err: any) {
      console.error('Metrics fetch error:', err);
      const msg = err?.response?.data?.message
        || err?.response?.data?.error
        || err?.message
        || 'Failed to fetch metrics';
      setMetricsError(msg);
      setMetrics([]);
    } finally {
      setMetricsLoading(false);
    }
  };

  useEffect(() => {
    document.documentElement.classList.toggle('alpha-light', !isDark);
  }, [isDark]);

  useEffect(() => {
    if (activeTab === 'documents' || activeTab === 'memo') {
      fetchDocuments();
    }
  }, [activeTab]);

  useEffect(() => {
    setMetricsError(null);
    if (activeTab === 'analytics' && selectedDocId) {
      if (metricsCacheRef.current[selectedDocId!]) {
        setMetrics(metricsCacheRef.current[selectedDocId!]);
      } else {
        fetchMetrics();
      }
    }
  }, [activeTab, selectedDocId]);

  useEffect(() => {
    const pollJobs = async () => {
      try {
        const res = await api.get('/jobs?limit=10&sort=-updatedAt');
        const jobs = res.data?.jobs || [];
        const steps: AgentStep[] = jobs.map((job: any) => ({
          id: job._id || job.id,
          label: JOB_TYPE_LABELS[job.type] || job.type,
          status: JOB_STATUS_MAP[job.status] || 'pending',
          detail: job.error || undefined,
          timestamp: job.updatedAt ? new Date(job.updatedAt).toLocaleTimeString() : undefined,
        }));
        setAgentSteps(steps);
      } catch {
        // silently ignore polling errors
      }
    };
    pollJobs();
    const interval = setInterval(pollJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchDocuments();
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const tabLabels: Record<TabType, string> = {
    chat: 'AI Research',
    documents: 'Documents',
    analytics: 'Analytics',
    memo: 'Research Memo',
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggle: () => setIsDark(p => !p) }}>
      <div
        className="flex h-screen font-['Inter',sans-serif] overflow-hidden"
        style={{ backgroundColor: 'var(--ad-bg)', color: 'var(--ad-text-primary)' }}
      >
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header />

          <div className="flex-1 grid grid-cols-12 gap-5 p-5 overflow-hidden">
            {/* Main Panel — expands when agent panel is closed */}
            <div className={`${agentPanelOpen ? 'col-span-8' : 'col-span-12'} flex flex-col gap-4 overflow-hidden min-w-0 transition-all duration-300`}>
              {/* Tab Bar */}
              <div
                className="flex gap-1.5 rounded-2xl p-1.5 border shrink-0"
                style={{ backgroundColor: 'var(--ad-surface)', borderColor: 'var(--ad-border)' }}
              >
                {(Object.keys(tabLabels) as TabType[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border"
                    style={{
                      backgroundColor: activeTab === tab ? 'var(--ad-accent-dim)' : 'transparent',
                      borderColor: activeTab === tab ? 'var(--ad-border-accent)' : 'transparent',
                      color: activeTab === tab ? 'var(--ad-accent)' : 'var(--ad-text-secondary)',
                    }}
                  >
                    {tabLabels[tab]}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-hidden min-w-0">
                {activeTab === 'chat' && (
                  <div
                    className="h-full rounded-[20px] border overflow-hidden"
                    style={{ backgroundColor: 'var(--ad-surface)', borderColor: 'var(--ad-border)' }}
                  >
                    <AIResearchChat selectedDocId={selectedDocId} />
                  </div>
                )}

                {activeTab === 'documents' && (
                  <div className="h-full overflow-y-auto space-y-4 pr-1">
                    {/* Upload Zone */}
                    <div
                      className="border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer"
                      style={{ borderColor: 'var(--ad-border-accent)', backgroundColor: 'var(--ad-accent-dim)' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--ad-accent-mid)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--ad-accent-dim)')}
                      onClick={handleUploadClick}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.txt"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <Upload className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--ad-accent)' }} />
                      <p className="font-semibold mb-1" style={{ color: 'var(--ad-text-primary)' }}>
                        Upload Financial Documents
                      </p>
                      <p className="text-sm mb-4" style={{ color: 'var(--ad-text-muted)' }}>
                        Annual reports, 10-K, 10-Q, earnings presentations, investor decks
                      </p>
                      <button
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg, #4F8EF7, #6B8DD6)' }}
                        disabled={uploading}
                      >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        {uploading ? 'Uploading...' : 'Add Document'}
                      </button>
                    </div>

                    {/* Document Cards */}
                    {documents.map(doc => (
                      <DocumentCard key={doc.id} {...doc} onSelect={handleSelectDocument} selected={doc.id === selectedDocId} />
                    ))}
                  </div>
                )}

                {activeTab === 'analytics' && (
                  <div className="h-full overflow-y-auto space-y-6 pr-1">
                    <div>
                      <h2 className="font-semibold mb-0.5" style={{ color: 'var(--ad-text-primary)' }}>
                        Financial Analytics
                      </h2>
                      <p className="text-sm mb-4" style={{ color: 'var(--ad-text-secondary)' }}>
                        {selectedDoc
                          ? `Analyzing ${selectedDoc.companyName} (${selectedDoc.ticker}) · Hover any card to expand chart`
                          : 'Select a document from the Documents tab to view financial analytics'}
                      </p>

                      {!selectedDoc ? (
                        <div
                          className="rounded-2xl border p-12 text-center"
                          style={{ backgroundColor: 'var(--ad-surface)', borderColor: 'var(--ad-border)' }}
                        >
                          <BarChart3 className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--ad-text-muted)' }} />
                          <p className="font-semibold mb-2" style={{ color: 'var(--ad-text-primary)' }}>
                            No Document Selected
                          </p>
                          <p className="text-sm" style={{ color: 'var(--ad-text-muted)' }}>
                            Go to the Documents tab, upload a financial report, and click on it to view analytics
                          </p>
                        </div>
                      ) : metricsLoading ? (
                        <div
                          className="rounded-2xl border p-12 text-center"
                          style={{ backgroundColor: 'var(--ad-surface)', borderColor: 'var(--ad-border)' }}
                        >
                          <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin" style={{ color: 'var(--ad-accent)' }} />
                          <p className="font-semibold" style={{ color: 'var(--ad-text-primary)' }}>
                            Running financial analysis...
                          </p>
                          <p className="text-sm mt-2" style={{ color: 'var(--ad-text-muted)' }}>
                            The AI agent is analyzing {selectedDoc.companyName}
                          </p>
                        </div>
                      ) : metricsError ? (
                        <div
                          className="rounded-2xl border p-12 text-center"
                          style={{ backgroundColor: 'var(--ad-surface)', borderColor: 'var(--ad-border)' }}
                        >
                          <p className="font-semibold mb-2" style={{ color: 'var(--ad-text-primary)' }}>
                            Unable to Load Metrics
                          </p>
                          <p className="text-sm" style={{ color: 'var(--ad-text-muted)' }}>
                            {metricsError}
                          </p>
                        </div>
                      ) : metrics.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                          {metrics.map((metric, i) => (
                            <FinancialWidget
                              key={i}
                              title={metric.title}
                              value={metric.value}
                              change={metric.change}
                              trend={metric.trend}
                              chartType={metric.chartType}
                              data={metric.data}
                              onExplain={() => setExplainMetric(metric.explain)}
                            />
                          ))}
                        </div>
                      ) : (
                        <div
                          className="rounded-2xl border p-12 text-center"
                          style={{ backgroundColor: 'var(--ad-surface)', borderColor: 'var(--ad-border)' }}
                        >
                          <p className="text-sm" style={{ color: 'var(--ad-text-muted)' }}>
                            No analytics data available. Try uploading a document first.
                          </p>
                        </div>
                      )}
                    </div>

                    <CompanyComparison />
                  </div>
                )}

                {activeTab === 'memo' && (
                  <div className="h-full overflow-hidden">
                    <ResearchMemoView companyId={selectedDocId} documents={documents} onSelectDocument={handleSelectDocument} />
                  </div>
                )}
              </div>
            </div>

            {/* Agent Activity Panel — 4 cols */}
            {agentPanelOpen ? (
              <div className="col-span-4 overflow-hidden">
                <AgentActivityMonitor steps={agentSteps} onToggle={() => setAgentPanelOpen(false)} />
              </div>
            ) : (
              <button
                onClick={() => setAgentPanelOpen(true)}
                className="fixed right-5 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-xl border transition-all hover:opacity-80"
                style={{ backgroundColor: 'var(--ad-surface)', borderColor: 'var(--ad-border)' }}
                title="Open agent activity"
              >
                <PanelRightOpen className="w-5 h-5" style={{ color: 'var(--ad-accent)' }} />
              </button>
            )}
          </div>
        </div>

        {/* AI Explain Drawer */}
        {explainMetric && (
          <AIExplainDrawer metric={explainMetric} onClose={() => setExplainMetric(null)} />
        )}
      </div>
    </ThemeContext.Provider>
  );
}
