type OrderRealtimePayload = {
  orderId: string;
  status?: string;
  branchId?: string;
  orderType?: string;
  order?: unknown;
  waiterId?: string;
  riderId?: string;
  chefId?: string;
};

function getIo() {
  return (globalThis as { ws?: { io?: import('socket.io').Server } }).ws?.io;
}

function basePayload(payload: OrderRealtimePayload) {
  return {
    ...payload,
    timestamp: new Date().toISOString(),
  };
}

function emitDashboardInvalidation(payload: OrderRealtimePayload) {
  const io = getIo();
  if (!io) return;
  const patch = {
    branchId: payload.branchId,
    orderId: payload.orderId,
    timestamp: new Date().toISOString(),
  };
  io.to('admin').emit('admin_dashboard:invalidate', patch);
  io.to('kitchen').emit('chef_dashboard:invalidate', patch);
  io.emit('admin_orders:invalidate', patch);
  io.emit('customer_home:invalidate', patch);
  if (payload.branchId) {
    io.to(`branch_${payload.branchId}`).emit('waiter_dashboard:invalidate', patch);
  }
  io.emit('waiter_dashboard:invalidate', patch);
  if (payload.riderId) {
    io.to(`rider_${payload.riderId}`).emit('rider_dashboard:invalidate', patch);
  }
  io.emit('rider_dashboard:invalidate', patch);
}

function emitToRooms(io: import('socket.io').Server, event: string, payload: Record<string, unknown>) {
  io.emit(event, payload);

  const branchId = payload.branchId as string | undefined;
  if (branchId) {
    io.to(`branch_${branchId}`).emit(event, payload);
    io.to('all-orders').emit(event, payload);
  }

  io.to('kitchen').emit(event, payload);
  io.to('admin').emit(event, payload);

  const waiterId = payload.waiterId as string | undefined;
  if (waiterId) {
    io.to(`waiter_${waiterId}`).emit(event, payload);
  }

  const riderId = payload.riderId as string | undefined;
  if (riderId) {
    io.to(`rider_${riderId}`).emit(event, payload);
  }

  const chefId = payload.chefId as string | undefined;
  if (chefId) {
    io.to(`chef_${chefId}`).emit(event, payload);
  }
}

export function emitOrderCreated(payload: OrderRealtimePayload) {
  try {
    const io = getIo();
    if (!io) return;
    const eventPayload = basePayload(payload);
    emitToRooms(io, 'order:created', eventPayload);
    io.emit('order:status_updated', eventPayload);
    emitDashboardInvalidation(payload);
  } catch (error) {
    console.error('[orderRealtime] emitOrderCreated failed', error);
  }
}

export function emitOrderStatusUpdated(payload: OrderRealtimePayload) {
  try {
    const io = getIo();
    if (!io) return;
    const eventPayload = basePayload(payload);
    emitToRooms(io, 'order:updated', eventPayload);
    io.emit('order:status_updated', eventPayload);
    emitDashboardInvalidation(payload);
  } catch (error) {
    console.error('[orderRealtime] emitOrderStatusUpdated failed', error);
  }
}

export function emitOrderAssigned(payload: OrderRealtimePayload) {
  try {
    const io = getIo();
    if (!io) return;
    const eventPayload = basePayload(payload);
    emitToRooms(io, 'order:assigned', eventPayload);
    io.emit('order:status_updated', eventPayload);
    emitDashboardInvalidation(payload);
  } catch (error) {
    console.error('[orderRealtime] emitOrderAssigned failed', error);
  }
}

export function emitOrderCancelled(payload: OrderRealtimePayload) {
  try {
    const io = getIo();
    if (!io) return;
    const eventPayload = basePayload(payload);
    emitToRooms(io, 'order:cancelled', eventPayload);
    io.emit('order:status_updated', eventPayload);
    emitDashboardInvalidation(payload);
  } catch (error) {
    console.error('[orderRealtime] emitOrderCancelled failed', error);
  }
}
