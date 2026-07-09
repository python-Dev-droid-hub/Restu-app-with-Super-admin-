import type { ReactNode } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, Label,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Box, Typography, alpha, useMediaQuery, useTheme } from '@mui/material';
import SaasCard from './SaasCard';
import { chartColors, saas } from './superAdminTokens';

function useChartHeight(defaultHeight = 280) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  return isMobile ? 220 : defaultHeight;
}

/** Recharts needs a numeric height — percentage heights often render blank. */
function ChartShell({ children, height = 280 }: { children: ReactNode; height?: number }) {
  const chartHeight = useChartHeight(height);
  return (
    <Box sx={{ width: '100%', minWidth: 0, height: chartHeight, minHeight: chartHeight }}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        {children}
      </ResponsiveContainer>
    </Box>
  );
}

function ChartEmpty({ message = 'No data for this period' }: { message?: string }) {
  const chartHeight = useChartHeight();
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      sx={{
        width: '100%',
        minWidth: 0,
        height: chartHeight,
        minHeight: chartHeight,
        border: `1px dashed ${saas.colors.cardBorder}`,
        borderRadius: `${saas.radius.md}px`,
        bgcolor: alpha(saas.colors.primary, 0.02),
        mx: 0.5,
        px: 2,
        textAlign: 'center',
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}

function hasChartData(data: unknown[], key: string) {
  if (!Array.isArray(data) || data.length === 0) return false;
  return data.some((row) => Number((row as Record<string, number>)[key]) > 0);
}

const tooltipStyle = {
  borderRadius: 8,
  border: `1px solid ${saas.colors.cardBorder}`,
  boxShadow: saas.shadow.card,
};

export function RevenueChart({ data }: { data: { label: string; monthly: number; yearly: number }[] }) {
  return (
    <SaasCard title="Revenue" subtitle="Monthly vs yearly billing (12 months)">
      <ChartShell>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={saas.colors.cardBorder} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: saas.colors.textMuted }} />
          <YAxis tick={{ fontSize: 11, fill: saas.colors.textMuted }} width={48} />
          <Tooltip formatter={(v: number) => `PKR ${v.toLocaleString()}`} contentStyle={tooltipStyle} />
          <Legend />
          <Line type="monotone" dataKey="monthly" stroke={chartColors[0]} name="Monthly billing" strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="yearly" stroke={chartColors[1]} name="Yearly billing" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ChartShell>
    </SaasCard>
  );
}

export function TenantGrowthChart({ data }: { data: { label: string; count: number }[] }) {
  return (
    <SaasCard title="Tenant growth" subtitle="New restaurants onboarded (6 months)">
      <ChartShell>
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={saas.colors.cardBorder} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: saas.colors.textMuted }} />
          <YAxis allowDecimals={false} tick={{ fill: saas.colors.textMuted }} width={32} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="count" fill={chartColors[0]} name="New tenants" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ChartShell>
    </SaasCard>
  );
}

export function PlanDistributionChart({ data }: { data: { planName: string; count: number }[] }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const filtered = data.filter((d) => d.count > 0);
  const total = filtered.reduce((sum, d) => sum + d.count, 0);

  return (
    <SaasCard title="Plan distribution" subtitle="Active tenants by subscription plan">
      {filtered.length === 0 ? (
        <ChartEmpty message="No active tenants on paid plans yet" />
      ) : (
        <ChartShell height={isMobile ? 260 : 300}>
          <PieChart margin={{ top: 8, right: 8, bottom: 36, left: 8 }}>
            <Pie
              data={filtered}
              dataKey="count"
              nameKey="planName"
              cx="50%"
              cy="42%"
              innerRadius={isMobile ? 48 : 58}
              outerRadius={isMobile ? 72 : 88}
              paddingAngle={filtered.length > 1 ? 3 : 0}
              labelLine={false}
              label={false}
            >
              {filtered.map((_, i) => (
                <Cell key={i} fill={chartColors[i % chartColors.length]} stroke="#fff" strokeWidth={2} />
              ))}
              {filtered.length === 1 ? (
                <>
                  <Label
                    value={`${((filtered[0].count / total) * 100).toFixed(0)}%`}
                    position="center"
                    style={{ fontSize: isMobile ? 22 : 26, fontWeight: 600, fill: saas.colors.textDark }}
                  />
                  <Label
                    value={filtered[0].planName}
                    position="center"
                    dy={22}
                    style={{ fontSize: 12, fill: saas.colors.textMuted }}
                  />
                </>
              ) : (
                <Label
                  value={String(total)}
                  position="center"
                  style={{ fontSize: 22, fontWeight: 600, fill: saas.colors.textDark }}
                />
              )}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: number, _name, item) => {
                const pct = total ? ((Number(v) / total) * 100).toFixed(0) : '0';
                const plan = (item as { payload?: { planName?: string } })?.payload?.planName || 'Plan';
                return [`${v} tenants (${pct}%)`, plan];
              }}
            />
            <Legend
              verticalAlign="bottom"
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={(value, entry) => {
                const count = Number((entry.payload as { count?: number })?.count ?? 0);
                const pct = total ? ((count / total) * 100).toFixed(0) : '0';
                return `${value} · ${count} (${pct}%)`;
              }}
            />
          </PieChart>
        </ChartShell>
      )}
    </SaasCard>
  );
}

export function OrderVolumeChart({ data }: { data: { label: string; orders: number }[] }) {
  return (
    <SaasCard title="Order volume" subtitle="Platform-wide orders (30 days)">
      <ChartShell>
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={saas.colors.cardBorder} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: saas.colors.textMuted }} interval={4} />
          <YAxis allowDecimals={false} tick={{ fill: saas.colors.textMuted }} width={32} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey="orders" stroke={chartColors[2]} fill="rgba(33,150,243,0.12)" name="Orders" strokeWidth={2} />
        </AreaChart>
      </ChartShell>
    </SaasCard>
  );
}

export function MrrGrowthChart({ data }: { data: { label: string; mrr: number }[] }) {
  const hasData = hasChartData(data, 'mrr');
  return (
    <SaasCard title="MRR growth" subtitle="Monthly recurring revenue trend (12 months)">
      {!hasData ? (
        <ChartEmpty message="MRR will appear once tenants have active subscriptions" />
      ) : (
        <ChartShell height={320}>
          <AreaChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColors[0]} stopOpacity={0.35} />
                <stop offset="100%" stopColor={chartColors[0]} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={saas.colors.cardBorder} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: saas.colors.textMuted }} />
            <YAxis
              tick={{ fontSize: 11, fill: saas.colors.textMuted }}
              width={52}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
            />
            <Tooltip formatter={(v: number) => [`PKR ${Number(v).toLocaleString()}`, 'MRR']} contentStyle={tooltipStyle} />
            <Area
              type="monotone"
              dataKey="mrr"
              stroke={chartColors[0]}
              fill="url(#mrrGradient)"
              strokeWidth={2.5}
              name="MRR"
              dot={{ r: 3, fill: chartColors[0], strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ChartShell>
      )}
    </SaasCard>
  );
}

export function ChurnChart({ data }: { data: { label: string; churned: number }[] }) {
  const series = data.length > 0 ? data : [];
  const hasData = hasChartData(series, 'churned');
  return (
    <SaasCard title="Churn" subtitle="Cancelled subscriptions by month">
      {!hasData ? (
        <ChartEmpty message="No cancellations in the last 6 months" />
      ) : (
        <ChartShell>
          <BarChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={saas.colors.cardBorder} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: saas.colors.textMuted }} />
            <YAxis allowDecimals={false} tick={{ fill: saas.colors.textMuted }} width={32} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="churned" fill="#F44336" name="Cancelled" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartShell>
      )}
    </SaasCard>
  );
}

export function RevenueByPlanChart({ data }: { data: { planName: string; mrr: number }[] }) {
  const filtered = data.filter((d) => d.mrr > 0);
  return (
    <SaasCard title="MRR by plan" subtitle="Recurring revenue contribution per tier">
      {filtered.length === 0 ? (
        <ChartEmpty message="No plan revenue recorded yet" />
      ) : (
        <ChartShell>
          <BarChart data={filtered} layout="vertical" margin={{ left: 4, right: 16, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={saas.colors.cardBorder} horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: saas.colors.textMuted }}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
            />
            <YAxis
              type="category"
              dataKey="planName"
              width={72}
              tick={{ fontSize: 11, fill: saas.colors.textDark }}
            />
            <Tooltip formatter={(v: number) => [`PKR ${Number(v).toLocaleString()}`, 'MRR']} contentStyle={tooltipStyle} />
            <Bar dataKey="mrr" fill={chartColors[0]} radius={[0, 6, 6, 0]} name="MRR" barSize={28} />
          </BarChart>
        </ChartShell>
      )}
    </SaasCard>
  );
}
