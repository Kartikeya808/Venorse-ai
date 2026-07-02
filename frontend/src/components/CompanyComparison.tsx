import React, { useState } from 'react';
import { GitCompare, ChevronDown, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip } from 'recharts';

const companies: Record<string, {
  name: string; ticker: string; revenue: string; revenueGrowth: string;
  netMargin: string; operatingMargin: string; debt: string; fcf: string;
  eps: string; roe: string; roa: string; peRatio: string; evEbitda: string;
  chartRevenue: number[]; trend: 'up' | 'down';
}> = {};

type CompanyKey = string;

const compareMetrics: { label: string; key: string }[] = [];

const aiSummaries: Record<string, string> = {};

function getAISummaryKey(c1: string, c2: string) {
  const sorted = [c1, c2].sort().join('-');
  return sorted;
}

function isPositiveValue(val: string): boolean {
  if (val === 'N/A') return false;
  if (val.startsWith('-')) return false;
  return true;
}

export function CompanyComparison() {
  const companyKeys = Object.keys(companies);
  const [company1, setCompany1] = useState<string>(companyKeys[0] || '');
  const [company2, setCompany2] = useState<string>(companyKeys[1] || '');
  const [open1, setOpen1] = useState(false);
  const [open2, setOpen2] = useState(false);

  if (!company1 || !company2 || !companies[company1] || !companies[company2]) {
    return (
      <div
        className="rounded-[20px] border overflow-hidden"
        style={{ backgroundColor: 'var(--ad-surface)', borderColor: 'var(--ad-border)' }}
      >
        <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--ad-border)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4F8EF7, #6B8DD6)' }}
            >
              <GitCompare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--ad-text-primary)' }}>
                Company Comparison
              </h3>
              <p className="text-xs" style={{ color: 'var(--ad-text-muted)' }}>
                Upload and process documents to compare companies
              </p>
            </div>
          </div>
        </div>
        <div className="px-6 py-12 text-center">
          <p className="text-sm" style={{ color: 'var(--ad-text-muted)' }}>
            No companies available yet. Upload financial documents to get started.
          </p>
        </div>
      </div>
    );
  }

  const c1 = companies[company1];
  const c2 = companies[company2];
  const summaryKey = getAISummaryKey(company1, company2);
  const aiSummary = aiSummaries[summaryKey] || `Comparing ${c1.name} and ${c2.name} across key financial metrics. Select different companies to see AI-generated analysis.`;

  const chartData = c1.chartRevenue.map((v, i) => ({
    year: `FY${2020 + i}`,
    [c1.ticker]: v,
    [c2.ticker]: c2.chartRevenue[i],
  }));
}
