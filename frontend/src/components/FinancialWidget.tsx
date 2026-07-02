import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Brain } from 'lucide-react';
import {
  AreaChart, Area, ResponsiveContainer, LineChart, Line, BarChart, Bar,
  Tooltip, XAxis,
} from 'recharts';

interface FinancialWidgetProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  chartType: 'area' | 'line' | 'bar';
  data: Array<{ value: number }>;
  onExplain: () => void;
}

const quarters = ['Q1\'22', 'Q2\'22', 'Q3\'22', 'Q4\'22', 'Q1\'23', 'Q2\'23', 'Q3\'23', 'Q4\'23'];

export function FinancialWidget({
  title,
  value,
  change,
  trend,
  chartType,
  data,
  onExplain,
}: FinancialWidgetProps) {
  const [hovered, setHovered] = useState(false);

  const chartColor = trend === 'up' ? 'var(--ad-success)' : '#E57373';
  const chartColorHex = trend === 'up' ? '#3FB68B' : '#E57373';

  const chartData = data.map((d, i) => ({ value: d.value, quarter: quarters[i] }));

  const miniChart = (
    <ResponsiveContainer width="100%" height="100%">
      {chartType === 'area' ? (
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={`grad-mini-${title}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColorHex} stopOpacity={0.35} />
              <stop offset="100%" stopColor={chartColorHex} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={chartColorHex}
            fill={`url(#grad-mini-${title})`}
            strokeWidth={1.5}
            dot={false}
          />
        </AreaChart>
      ) : chartType === 'line' ? (
        <LineChart data={chartData}>
          <Line type="monotone" dataKey="value" stroke={chartColorHex} strokeWidth={1.5} dot={false} />
        </LineChart>
      ) : (
        <BarChart data={chartData}>
          <Bar dataKey="value" fill={chartColorHex} radius={[2, 2, 0, 0]} />
        </BarChart>
      )}
    </ResponsiveContainer>
  );

  const expandedChart = (
    <ResponsiveContainer width="100%" height="100%">
      {chartType === 'area' ? (
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={`grad-exp-${title}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColorHex} stopOpacity={0.4} />
              <stop offset="100%" stopColor={chartColorHex} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="quarter" tick={{ fill: 'var(--ad-text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--ad-surface)',
              border: '1px solid var(--ad-border)',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'var(--ad-text-primary)',
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={chartColorHex}
            fill={`url(#grad-exp-${title})`}
            strokeWidth={2}
            dot={{ fill: chartColorHex, r: 3 }}
          />
        </AreaChart>
      ) : chartType === 'line' ? (
        <LineChart data={chartData}>
          <XAxis dataKey="quarter" tick={{ fill: 'var(--ad-text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--ad-surface)',
              border: '1px solid var(--ad-border)',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'var(--ad-text-primary)',
            }}
          />
          <Line type="monotone" dataKey="value" stroke={chartColorHex} strokeWidth={2} dot={{ fill: chartColorHex, r: 3 }} />
        </LineChart>
      ) : (
        <BarChart data={chartData}>
          <XAxis dataKey="quarter" tick={{ fill: 'var(--ad-text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--ad-surface)',
              border: '1px solid var(--ad-border)',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'var(--ad-text-primary)',
            }}
          />
          <Bar dataKey="value" fill={chartColorHex} radius={[4, 4, 0, 0]} />
        </BarChart>
      )}
    </ResponsiveContainer>
  );

  return (
    <div
      className="rounded-2xl border transition-all duration-300 overflow-hidden cursor-default"
      style={{
        backgroundColor: 'var(--ad-surface)',
        borderColor: hovered ? 'var(--ad-border-accent)' : 'var(--ad-border)',
        boxShadow: hovered ? 'var(--ad-shadow)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="p-4">
        {/* Title + Trend */}
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-medium" style={{ color: 'var(--ad-text-muted)' }}>{title}</p>
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: trend === 'up' ? 'var(--ad-success-dim)' : 'rgba(229,115,115,0.1)',
              color: trend === 'up' ? 'var(--ad-success)' : '#E57373',
            }}
          >
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {change}
          </div>
        </div>

        {/* Value */}
        <p className="text-2xl font-bold mb-3" style={{ color: 'var(--ad-text-primary)' }}>
          {value}
        </p>

        {/* Chart */}
        <div
          className="transition-all duration-300"
          style={{ height: hovered ? '100px' : '52px', marginLeft: '-4px', marginRight: '-4px' }}
        >
          {hovered ? expandedChart : miniChart}
        </div>
      </div>

      {/* AI Explain Button */}
      <button
        onClick={e => { e.stopPropagation(); onExplain(); }}
        className="w-full px-4 py-2.5 border-t flex items-center justify-center gap-1.5 text-xs font-medium transition-all"
        style={{
          borderColor: 'var(--ad-border)',
          backgroundColor: hovered ? 'var(--ad-accent-dim)' : 'transparent',
          color: hovered ? 'var(--ad-accent)' : 'var(--ad-text-muted)',
        }}
      >
        <Brain className="w-3.5 h-3.5" />
        AI Explain
      </button>
    </div>
  );
}
