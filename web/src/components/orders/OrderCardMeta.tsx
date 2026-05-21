import { Box, Typography } from '@mui/material';

export type OrderMetaProps = {
  orderType?: string;
  tableNumber?: string | number | null;
  partyLabel?: string;
  partyName?: string;
  waiterName?: string | null;
  customerName?: string;
};

/** Table + waiter/customer line shown on kitchen/admin order cards */
export function OrderCardMeta({ order }: { order: OrderMetaProps }) {
  const type = String(order.orderType || '').toUpperCase();
  const isDineIn = type === 'DINE_IN' || type === 'PICKUP' || Boolean(order.tableNumber);
  const table =
    order.tableNumber != null && String(order.tableNumber).trim()
      ? String(order.tableNumber).trim()
      : '';
  const label = order.partyLabel || (isDineIn ? 'Waiter' : 'Customer');
  const name =
    order.partyName ||
    order.waiterName ||
    (isDineIn ? '' : order.customerName) ||
    '—';

  return (
    <Box sx={{ mt: 0.75, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
      {table ? (
        <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#1565C0' }}>
          Table {table}
        </Typography>
      ) : isDineIn ? (
        <Typography sx={{ fontSize: 12, color: '#888' }}>Table —</Typography>
      ) : null}
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: isDineIn ? '#2E7D32' : '#444' }}>
        {label}: {name}
      </Typography>
    </Box>
  );
}
