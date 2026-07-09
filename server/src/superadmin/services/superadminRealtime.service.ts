import type { Server as SocketIOServer } from 'socket.io';

let ioInstance: SocketIOServer | null = null;

export function setSuperAdminIo(io: SocketIOServer) {
  ioInstance = io;
}

export function emitSuperAdminEvent(event: string, payload: unknown) {
  if (!ioInstance) return;
  ioInstance.to('superadmin').emit(event, payload);
}

export function notifyTenantLaunched(tenant: { _id: unknown; name: string; slug: string }) {
  emitSuperAdminEvent('tenant:launched', {
    tenantId: String(tenant._id),
    name: tenant.name,
    slug: tenant.slug,
    at: new Date().toISOString(),
  });
}

export function notifyDashboardRefresh() {
  emitSuperAdminEvent('dashboard:refresh', { at: new Date().toISOString() });
}
