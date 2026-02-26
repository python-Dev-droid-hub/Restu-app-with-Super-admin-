interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: string;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

const colorMap = {
  primary: { bg: '#e3f2fd', text: '#1976d2', border: '#90caf9' },
  success: { bg: '#e8f5e9', text: '#388e3c', border: '#a5d6a7' },
  warning: { bg: '#fff3e0', text: '#f57c00', border: '#ffcc80' },
  danger: { bg: '#ffebee', text: '#d32f2f', border: '#ef9a9a' },
  info: { bg: '#e0f7fa', text: '#0097a7', border: '#80deea' },
};

export function StatCard({ title, value, change, icon, color = 'primary' }: StatCardProps) {
  const colors = colorMap[color];

  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        borderLeft: `4px solid ${colors.border}`,
        minWidth: '200px',
        flex: '1',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: '#666',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {title}
          </p>
          <h3
            style={{
              margin: '8px 0 0 0',
              fontSize: '32px',
              fontWeight: 700,
              color: '#1a1a2e',
            }}
          >
            {value}
          </h3>
          {change !== undefined && (
            <p
              style={{
                margin: '8px 0 0 0',
                fontSize: '14px',
                color: change >= 0 ? '#388e3c' : '#d32f2f',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <span style={{ marginRight: '4px' }}>{change >= 0 ? '↑' : '↓'}</span>
              {Math.abs(change)}%
              <span style={{ color: '#666', marginLeft: '4px' }}>from last month</span>
            </p>
          )}
        </div>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: colors.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
