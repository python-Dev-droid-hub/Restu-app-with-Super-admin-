import React, { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AnalyticsReportData } from '../../types/analyticsReport';
import './AnalyticsReportTemplate.css';

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
const STATUS_COLORS: Record<string, string> = {
  COMPLETED: '#10b981',
  DELIVERED: '#06b6d4',
  READY: '#8b5cf6',
  CANCELLED: '#ef4444',
  PREPARING: '#f59e0b',
  PENDING: '#94a3b8',
};

export interface AnalyticsReportTemplateProps {
  data: AnalyticsReportData;
  formatCurrency: (n: number) => string;
  loading?: boolean;
  darkMode?: boolean;
  exportMode?: boolean;
  id?: string;
}

function TrendBadge({ value }: { value?: number }) {
  if (value === undefined || Number.isNaN(value)) return null;
  const up = value >= 0;
  return (
    <span className={`analytics-report__trend analytics-report__trend--${up ? 'up' : 'down'}`}>
      {up ? '↑' : '↓'} {Math.abs(value)}% vs prior
    </span>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="analytics-report__section">
      <h2 className="analytics-report__section-title">{title}</h2>
      {description && <p className="analytics-report__section-desc">{description}</p>}
      {children}
    </section>
  );
}

function KpiCard({
  icon,
  accent,
  label,
  value,
  trend,
}: {
  icon: string;
  accent: string;
  label: string;
  value: string;
  trend?: number;
}) {
  return (
    <article className="analytics-report__kpi" style={{ ['--kpi-accent' as string]: accent }}>
      <div
        className="analytics-report__kpi-icon"
        style={{
          background: (() => {
            const hex = accent.replace('#', '');
            if (hex.length !== 6) return 'rgba(99, 102, 241, 0.12)';
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            return `rgba(${r}, ${g}, ${b}, 0.12)`;
          })(),
        }}
      >
        {icon}
      </div>
      <p className="analytics-report__kpi-value">{value}</p>
      <p className="analytics-report__kpi-label">{label}</p>
      <TrendBadge value={trend} />
    </article>
  );
}

export const AnalyticsReportTemplate: React.FC<AnalyticsReportTemplateProps> = ({
  data,
  formatCurrency,
  loading = false,
  darkMode = false,
  exportMode = false,
  id,
}) => {
  const rootId = id ?? (exportMode ? 'analytics-report-root' : undefined);
  const { meta, kpis, revenueByPeriod, topBranches, topProducts, userGrowth, peakOrderDays, orderStatusDistribution } =
    data;

  const statusRows = useMemo(() => {
    const entries = Object.entries(orderStatusDistribution || {});
    const total = entries.reduce((s, [, c]) => s + c, 0) || 1;
    return entries
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => ({
        status: status.replace(/_/g, ' '),
        count,
        pct: Math.round((count / total) * 100),
        color: STATUS_COLORS[status] || CHART_COLORS[0],
      }));
  }, [orderStatusDistribution]);

  const pieData = statusRows.map((r) => ({ name: r.status, value: r.count, fill: r.color }));
  const generatedLabel = new Date(meta.generatedAt).toLocaleString();
  const initials = meta.restaurantName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const rootClass = `analytics-report${exportMode ? ' analytics-report--export' : ''}`;

  if (loading) {
    return (
      <div id={rootId} className={rootClass} data-theme={darkMode ? 'dark' : 'light'}>
        <div className="analytics-report__skeleton" style={{ height: 120, marginBottom: 24 }} />
        <div className="analytics-report__kpi-grid">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="analytics-report__skeleton" style={{ height: 140 }} />
          ))}
        </div>
        <div className="analytics-report__skeleton" style={{ height: 320 }} />
      </div>
    );
  }

  return (
    <div id={rootId} className={rootClass} data-theme={darkMode ? 'dark' : 'light'}>
      <header className="analytics-report__header">
        <div className="analytics-report__brand">
          <div className="analytics-report__logo">
            {meta.logoUrl ? <img src={meta.logoUrl} alt="" /> : initials}
          </div>
          <div>
            <h1 className="analytics-report__title">{meta.reportTitle}</h1>
            <p className="analytics-report__subtitle">{meta.restaurantName}</p>
          </div>
        </div>
        <div className="analytics-report__meta-grid">
          <div>
            <span>Generated</span>
            <br />
            <strong>{generatedLabel}</strong>
          </div>
          <div>
            <span>Period</span>
            <br />
            <strong>{meta.periodLabel}</strong>
          </div>
          <div>
            <span>Branch</span>
            <br />
            <strong>{meta.branchLabel}</strong>
          </div>
        </div>
      </header>

      <div className="analytics-report__kpi-grid">
        <KpiCard icon="💰" accent="#10b981" label="Total Revenue" value={formatCurrency(kpis.totalRevenue)} trend={kpis.trends.revenue} />
        <KpiCard icon="🧾" accent="#f59e0b" label="Total Orders" value={kpis.totalOrders.toLocaleString()} trend={kpis.trends.orders} />
        <KpiCard icon="📊" accent="#6366f1" label="Avg Order Value" value={formatCurrency(kpis.averageOrderValue)} trend={kpis.trends.averageOrderValue} />
        <KpiCard icon="👥" accent="#06b6d4" label="Total Customers" value={kpis.totalCustomers.toLocaleString()} trend={kpis.trends.customers} />
        <KpiCard icon="📈" accent="#8b5cf6" label="Growth" value={`${kpis.growthPercent >= 0 ? '+' : ''}${kpis.growthPercent}%`} trend={kpis.growthPercent} />
      </div>

      <Section title="Revenue Analytics" description="Revenue and order volume over the selected period">
        <div className="analytics-report__grid-2">
          <div className="analytics-report__chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueByPeriod}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e8edf4'} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Revenue</th>
                <th>Orders</th>
              </tr>
            </thead>
            <tbody>
              {revenueByPeriod.length ? (
                revenueByPeriod.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td>{formatCurrency(row.revenue)}</td>
                    <td>{row.orders.toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', color: 'var(--ar-muted)' }}>
                    No revenue data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Orders Analytics" description="Order trends and peak periods">
        <div className="analytics-report__grid-2">
          <div className="analytics-report__chart analytics-report__chart--sm">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByPeriod}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="orders" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="analytics-report__chart analytics-report__chart--sm">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakOrderDays} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="label" width={72} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="orders" fill="#06b6d4" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Section>

      <Section title="Top Branches" description="Performance by location">
        <table>
          <thead>
            <tr>
              <th>Branch</th>
              <th>Revenue</th>
              <th>Orders</th>
              <th>Performance</th>
            </tr>
          </thead>
          <tbody>
            {topBranches.length ? (
              topBranches.map((b) => (
                <tr key={b.name}>
                  <td>{b.name}</td>
                  <td>{formatCurrency(b.revenue)}</td>
                  <td>{b.orders.toLocaleString()}</td>
                  <td>
                    <span className={`analytics-report__badge analytics-report__badge--${b.performance}`}>
                      {b.performance}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--ar-muted)' }}>
                  No branch data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>

      {topProducts.length > 0 && (
        <Section title="Top Products" description="Best sellers in this period">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p) => (
                <tr key={p.name}>
                  <td>{p.name}</td>
                  <td>{p.count}</td>
                  <td>{formatCurrency(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      <div className="analytics-report__grid-2">
        <Section title="User Growth" description="New registered users">
          <div className="analytics-report__chart analytics-report__chart--sm">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="users" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Order Status" description="Distribution across statuses">
          <div className="analytics-report__grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="analytics-report__chart analytics-report__chart--sm">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                      {pieData.map((entry, i) => (
                        <Cell key={entry.name} fill={entry.fill || CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ color: 'var(--ar-muted)', fontSize: 13 }}>No status data</p>
              )}
            </div>
            <div className="analytics-report__status-bars">
              {statusRows.map((row) => (
                <div key={row.status} className="analytics-report__status-row">
                  <span>{row.status}</span>
                  <div className="analytics-report__status-track">
                    <div
                      className="analytics-report__status-fill"
                      style={{ width: `${row.pct}%`, background: row.color }}
                    />
                  </div>
                  <strong>{row.pct}%</strong>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>

      <footer className="analytics-report__footer">
        <span>Generated by Restaurant Management System</span>
        <span>
          Page {meta.page ?? 1} of {meta.totalPages ?? 1} · Exported {generatedLabel}
        </span>
      </footer>
    </div>
  );
};
