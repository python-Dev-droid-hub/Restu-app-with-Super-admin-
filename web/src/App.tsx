import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import type { ReactElement } from 'react';
import { SettingsProvider } from './context/SettingsContext';
import { TenantBrandingProvider } from './context/TenantBrandingProvider';
import BrowserNotificationListener from './components/BrowserNotificationListener';
import Layout from './components/Layout';
import { Login } from './pages/Login';
import { hasAuthSession, getStoredRole } from './utils/authStorage';
import { hasSuperAdminSession } from './utils/superAdminAuthStorage';

// MUI Admin Panel Components
import AdminLayout from './components/admin/AdminLayout';

import CustomerLayout from './components/customer/CustomerLayout';

import './styles/variables.css';
import './components/Layout.css';
import './pages/Dashboard.css';
import './styles/components.css';
import './styles/StandardLayout.css';

const Orders = lazy(() => import('./pages/Orders'));
const Products = lazy(() => import('./pages/Products'));
const Branches = lazy(() => import('./pages/Branches'));
const Users = lazy(() => import('./pages/Users'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const Tables = lazy(() => import('./pages/Tables'));
const Notifications = lazy(() => import('./pages/Notifications'));
const MobileRequired = lazy(() => import('./pages/MobileRequired'));

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminBranches = lazy(() => import('./pages/admin/AdminBranches'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminRiders = lazy(() => import('./pages/admin/AdminRiders'));
const AdminKitchens = lazy(() => import('./pages/admin/AdminKitchens'));
const AdminCustomers = lazy(() => import('./pages/admin/AdminCustomers'));
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminCoupons = lazy(() => import('./pages/admin/AdminCoupons'));
const AdminDealCampaigns = lazy(() => import('./pages/admin/AdminDealCampaigns'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
import AdminSupport from './pages/admin/AdminSupport';
const AdminProductSize = lazy(() => import('./pages/admin/AdminProductSize'));
const AdminTableAssignment = lazy(() => import('./pages/admin/AdminTableAssignment'));
const AdminBanners = lazy(() => import('./pages/admin/AdminBanners'));

const CustomerHome = lazy(() => import('./pages/customer/CustomerHome'));
const CustomerMenu = lazy(() => import('./pages/customer/CustomerMenu'));
const CustomerCart = lazy(() => import('./pages/customer/CustomerCart'));
const CustomerOrders = lazy(() => import('./pages/customer/CustomerOrders'));

const WaiterDashboard = lazy(() => import('./pages/waiter/WaiterDashboard'));
const CheckoutPage = lazy(() => import('./pages/customer/CheckoutPage'));
const RiderDashboard = lazy(() => import('./pages/rider/RiderDashboard'));

const ManagerDashboard = lazy(() => import('./pages/manager/ManagerDashboard'));
const ManagerMore = lazy(() => import('./pages/manager/ManagerMore'));
const ChefDashboard = lazy(() => import('./pages/chef/ChefDashboard'));

const SuperAdminLogin = lazy(() => import('./pages/superadmin/SuperAdminLogin'));
const SuperAdminDashboard = lazy(() => import('./pages/superadmin/SuperAdminDashboard'));
const SuperAdminTenants = lazy(() => import('./pages/superadmin/SuperAdminTenants'));
const SuperAdminLaunchTenant = lazy(() => import('./pages/superadmin/SuperAdminLaunchTenant'));
const SuperAdminTenantDetail = lazy(() => import('./pages/superadmin/SuperAdminTenantDetail'));
const SuperAdminPlans = lazy(() => import('./pages/superadmin/SuperAdminPlans'));
const SuperAdminPlanForm = lazy(() => import('./pages/superadmin/SuperAdminPlanForm'));
const SuperAdminSubscriptions = lazy(() => import('./pages/superadmin/SuperAdminSubscriptions'));
const SuperAdminBillingAnalytics = lazy(() => import('./pages/superadmin/SuperAdminBillingAnalytics'));
const SuperAdminEditTenant = lazy(() => import('./pages/superadmin/SuperAdminEditTenant'));
const SuperAdminSupport = lazy(() => import('./pages/superadmin/SuperAdminSupport'));
const SuperAdminSupportDetail = lazy(() => import('./pages/superadmin/SuperAdminSupportDetail'));
const SuperAdminAnnouncements = lazy(() => import('./pages/superadmin/SuperAdminAnnouncements'));
const SuperAdminActivity = lazy(() => import('./pages/superadmin/SuperAdminActivity'));
const SuperAdminSettings = lazy(() => import('./pages/superadmin/SuperAdminSettings'));
const AuthImpersonate = lazy(() => import('./pages/AuthImpersonate').then((m) => ({ default: m.AuthImpersonate })));
const AccountSuspended = lazy(() => import('./pages/AccountSuspended'));
const MaintenanceMode = lazy(() => import('./pages/MaintenanceMode'));

function RequireSuperAdminAuth({ children }: { children: ReactElement }) {
  if (!hasSuperAdminSession()) {
    return <Navigate to="/superadmin/login" replace />;
  }
  return children;
}

function RequireAdminAuth({ children }: { children: ReactElement }) {
  const role = getStoredRole();
  if (!hasAuthSession()) {
    return <Navigate to="/login" replace />;
  }
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return <Navigate to="/" replace />;
  }
  return children;
}

function RequireManagerAuth({ children }: { children: ReactElement }) {
  const role = getStoredRole();
  if (!hasAuthSession()) {
    return <Navigate to="/login" replace />;
  }
  if (role !== 'BRANCH_MANAGER') {
    return <Navigate to="/" replace />;
  }
  return children;
}

function RequireChefAuth({ children }: { children: ReactElement }) {
  const role = getStoredRole();
  if (!hasAuthSession()) {
    return <Navigate to="/login" replace />;
  }
  if (role !== 'CHEF') {
    return <Navigate to="/" replace />;
  }
  return children;
}

function RequireWaiterAuth({ children }: { children: ReactElement }) {
  const role = getStoredRole();
  if (!hasAuthSession()) {
    return <Navigate to="/login" replace />;
  }
  if (role !== 'WAITER' && role !== 'ADMIN' && role !== 'SUPER_ADMIN' && role !== 'BRANCH_MANAGER') {
    return <Navigate to="/" replace />;
  }
  return children;
}

function RequireRiderAuth({ children }: { children: ReactElement }) {
  const role = getStoredRole();
  if (!hasAuthSession()) {
    return <Navigate to="/login" replace />;
  }
  if (role !== 'RIDER' && role !== 'SUPER_ADMIN') {
    return <Navigate to="/" replace />;
  }
  return children;
}

function RootRedirect() {
  const role = getStoredRole();

  if (!hasAuthSession()) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (role === 'BRANCH_MANAGER') {
    return <Navigate to="/manager/dashboard" replace />;
  }

  if (role === 'CHEF') {
    return <Navigate to="/chef/dashboard" replace />;
  }

  if (role === 'WAITER') {
    return <Navigate to="/waiter" replace />;
  }

  if (role === 'RIDER') {
    return <Navigate to="/rider" replace />;
  }

  return <Navigate to="/customer" replace />;
}

function App() {
  return (
    <SettingsProvider>
      <BrowserNotificationListener />
      <Router>
        <TenantBrandingProvider>
        <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/superadmin/login" element={<SuperAdminLogin />} />
            <Route path="/superadmin" element={<Navigate to="/superadmin/dashboard" replace />} />
            <Route path="/account-suspended" element={<AccountSuspended />} />
            <Route path="/maintenance" element={<MaintenanceMode />} />
            <Route path="/superadmin/dashboard" element={<RequireSuperAdminAuth><SuperAdminDashboard /></RequireSuperAdminAuth>} />
            <Route path="/superadmin/tenants" element={<RequireSuperAdminAuth><SuperAdminTenants /></RequireSuperAdminAuth>} />
            <Route path="/superadmin/tenants/new" element={<RequireSuperAdminAuth><SuperAdminLaunchTenant /></RequireSuperAdminAuth>} />
            <Route path="/superadmin/tenants/:id/edit" element={<RequireSuperAdminAuth><SuperAdminEditTenant /></RequireSuperAdminAuth>} />
            <Route path="/superadmin/tenants/:id" element={<RequireSuperAdminAuth><SuperAdminTenantDetail /></RequireSuperAdminAuth>} />
            <Route path="/superadmin/plans" element={<RequireSuperAdminAuth><SuperAdminPlans /></RequireSuperAdminAuth>} />
            <Route path="/superadmin/plans/new" element={<RequireSuperAdminAuth><SuperAdminPlanForm /></RequireSuperAdminAuth>} />
            <Route path="/superadmin/plans/:id/edit" element={<RequireSuperAdminAuth><SuperAdminPlanForm /></RequireSuperAdminAuth>} />
            <Route path="/superadmin/subscriptions" element={<RequireSuperAdminAuth><SuperAdminSubscriptions /></RequireSuperAdminAuth>} />
            <Route path="/superadmin/billing/analytics" element={<RequireSuperAdminAuth><SuperAdminBillingAnalytics /></RequireSuperAdminAuth>} />
            <Route path="/superadmin/support" element={<RequireSuperAdminAuth><SuperAdminSupport /></RequireSuperAdminAuth>} />
            <Route path="/superadmin/support/:id" element={<RequireSuperAdminAuth><SuperAdminSupportDetail /></RequireSuperAdminAuth>} />
            <Route path="/superadmin/announcements" element={<RequireSuperAdminAuth><SuperAdminAnnouncements /></RequireSuperAdminAuth>} />
            <Route path="/superadmin/activity" element={<RequireSuperAdminAuth><SuperAdminActivity /></RequireSuperAdminAuth>} />
            <Route path="/superadmin/settings" element={<RequireSuperAdminAuth><SuperAdminSettings /></RequireSuperAdminAuth>} />
            <Route path="/superadmin/settings/general" element={<Navigate to="/superadmin/settings?section=general" replace />} />
            <Route path="/superadmin/settings/email-templates" element={<Navigate to="/superadmin/settings?section=templates" replace />} />
            <Route path="/superadmin/settings/email-templates/:key" element={<Navigate to="/superadmin/settings?section=templates" replace />} />
            <Route path="/superadmin/settings/team" element={<Navigate to="/superadmin/settings?section=team" replace />} />
            <Route path="/auth/impersonate" element={<AuthImpersonate />} />
            <Route path="/mobile-required" element={<MobileRequired />} />
              <Route
                path="/waiter/*"
                element={
                  <RequireWaiterAuth>
                    <AdminLayout mode="waiter">
                      <Suspense fallback={<div>Loading...</div>}>
                        <WaiterDashboard />
                      </Suspense>
                    </AdminLayout>
                  </RequireWaiterAuth>
                }
              />
              <Route
                path="/rider/*"
                element={
                  <RequireRiderAuth>
                    <AdminLayout mode="rider">
                      <Suspense fallback={<div>Loading...</div>}>
                        <RiderDashboard />
                      </Suspense>
                    </AdminLayout>
                  </RequireRiderAuth>
                }
              />

            <Route
              path="/customer"
              element={
                <CustomerLayout>
                  <CustomerHome />
                </CustomerLayout>
              }
            />
            <Route
              path="/customer/menu"
              element={
                <CustomerLayout>
                  <CustomerMenu />
                </CustomerLayout>
              }
            />
            <Route
              path="/customer/cart"
              element={
                <CustomerLayout>
                  <CustomerCart />
                </CustomerLayout>
              }
            />
            <Route
              path="/customer/orders"
              element={
                <CustomerLayout>
                  <CustomerOrders />
                </CustomerLayout>
              }
            />
            <Route
              path="/customer/checkout"
              element={
                <CustomerLayout>
                  <CheckoutPage />
                </CustomerLayout>
              }
            />

            <Route path="/admin/dashboard" element={<RequireAdminAuth><AdminLayout><AdminDashboard /></AdminLayout></RequireAdminAuth>} />
            <Route path="/admin/branches" element={<RequireAdminAuth><AdminLayout><AdminBranches /></AdminLayout></RequireAdminAuth>} />
            <Route path="/admin/orders" element={<RequireAdminAuth><AdminLayout><AdminOrders /></AdminLayout></RequireAdminAuth>} />
            <Route path="/admin/riders" element={<RequireAdminAuth><AdminLayout><AdminRiders /></AdminLayout></RequireAdminAuth>} />
            <Route path="/admin/kitchens" element={<RequireAdminAuth><AdminLayout><AdminKitchens /></AdminLayout></RequireAdminAuth>} />
            <Route path="/admin/customers" element={<RequireAdminAuth><AdminLayout><AdminCustomers /></AdminLayout></RequireAdminAuth>} />
            <Route path="/admin/notifications" element={<RequireAdminAuth><AdminLayout><AdminNotifications /></AdminLayout></RequireAdminAuth>} />
            <Route path="/admin/categories" element={<RequireAdminAuth><AdminLayout><AdminCategories /></AdminLayout></RequireAdminAuth>} />
            <Route path="/admin/products" element={<RequireAdminAuth><AdminLayout><AdminProducts pageTitle="Products" /></AdminLayout></RequireAdminAuth>} />
            <Route path="/admin/menu" element={<RequireAdminAuth><AdminLayout><AdminProducts pageTitle="Menu" /></AdminLayout></RequireAdminAuth>} />
            <Route path="/admin/coupons" element={<RequireAdminAuth><AdminLayout><AdminCoupons /></AdminLayout></RequireAdminAuth>} />
            <Route path="/admin/deals" element={<RequireAdminAuth><AdminLayout><AdminDealCampaigns /></AdminLayout></RequireAdminAuth>} />
            <Route path="/admin/deal-campaigns" element={<RequireAdminAuth><AdminLayout><AdminDealCampaigns /></AdminLayout></RequireAdminAuth>} />
            <Route path="/admin/product-size" element={<RequireAdminAuth><AdminLayout><AdminProductSize /></AdminLayout></RequireAdminAuth>} />
            <Route path="/admin/table-assignment" element={<RequireAdminAuth><AdminLayout><AdminTableAssignment /></AdminLayout></RequireAdminAuth>} />
            <Route path="/admin/banners" element={<RequireAdminAuth><AdminLayout><AdminBanners /></AdminLayout></RequireAdminAuth>} />
            <Route path="/admin/reports" element={<RequireAdminAuth><AdminLayout><AdminReports /></AdminLayout></RequireAdminAuth>} />
            <Route path="/admin/settings" element={<RequireAdminAuth><AdminLayout><AdminSettings /></AdminLayout></RequireAdminAuth>} />
            <Route path="/admin/support" element={<RequireAdminAuth><AdminLayout><AdminSupport /></AdminLayout></RequireAdminAuth>} />

            <Route path="/manager/dashboard" element={<RequireManagerAuth><AdminLayout mode="manager"><ManagerDashboard /></AdminLayout></RequireManagerAuth>} />
            <Route path="/manager/orders" element={<RequireManagerAuth><AdminLayout mode="manager"><AdminOrders /></AdminLayout></RequireManagerAuth>} />
            <Route path="/manager/users" element={<RequireManagerAuth><AdminLayout mode="manager"><AdminCustomers /></AdminLayout></RequireManagerAuth>} />
            <Route path="/manager/menu" element={<RequireManagerAuth><AdminLayout mode="manager"><AdminProducts pageTitle="Menu" /></AdminLayout></RequireManagerAuth>} />
            <Route path="/manager/more" element={<RequireManagerAuth><AdminLayout mode="manager"><ManagerMore /></AdminLayout></RequireManagerAuth>} />
            <Route path="/manager/notifications" element={<RequireManagerAuth><AdminLayout mode="manager"><AdminNotifications /></AdminLayout></RequireManagerAuth>} />
            <Route path="/manager/table-assignment" element={<RequireManagerAuth><AdminLayout mode="manager"><AdminTableAssignment /></AdminLayout></RequireManagerAuth>} />
            <Route path="/manager/riders" element={<RequireManagerAuth><AdminLayout mode="manager"><AdminRiders /></AdminLayout></RequireManagerAuth>} />
            <Route path="/manager/categories" element={<RequireManagerAuth><AdminLayout mode="manager"><AdminCategories /></AdminLayout></RequireManagerAuth>} />
            <Route path="/manager/products" element={<RequireManagerAuth><AdminLayout mode="manager"><AdminProducts pageTitle="Products" /></AdminLayout></RequireManagerAuth>} />
            <Route path="/manager/banners" element={<RequireManagerAuth><AdminLayout mode="manager"><AdminBanners /></AdminLayout></RequireManagerAuth>} />
            <Route path="/manager/coupons" element={<RequireManagerAuth><AdminLayout mode="manager"><AdminCoupons /></AdminLayout></RequireManagerAuth>} />
            <Route path="/manager/deals" element={<RequireManagerAuth><AdminLayout mode="manager"><AdminDealCampaigns /></AdminLayout></RequireManagerAuth>} />
            <Route path="/manager/product-size" element={<RequireManagerAuth><AdminLayout mode="manager"><AdminProductSize /></AdminLayout></RequireManagerAuth>} />
            <Route path="/manager/reports" element={<RequireManagerAuth><AdminLayout mode="manager"><AdminReports /></AdminLayout></RequireManagerAuth>} />
            <Route path="/manager/settings" element={<Navigate to="/manager/dashboard" replace />} />
            <Route path="/manager/support" element={<RequireManagerAuth><AdminLayout mode="manager"><AdminSupport /></AdminLayout></RequireManagerAuth>} />

            <Route path="/chef/dashboard" element={<RequireChefAuth><AdminLayout mode="chef"><ChefDashboard initialTab="home" /></AdminLayout></RequireChefAuth>} />
            <Route path="/chef/dashbaord" element={<Navigate to="/chef/dashboard" replace />} />
            <Route path="/chef/cooking" element={<RequireChefAuth><AdminLayout mode="chef"><ChefDashboard initialTab="cooking" /></AdminLayout></RequireChefAuth>} />
            <Route path="/chef/notifications" element={<RequireChefAuth><AdminLayout mode="chef"><ChefDashboard initialTab="notifications" /></AdminLayout></RequireChefAuth>} />
            <Route path="/chef/profile" element={<RequireChefAuth><AdminLayout mode="chef"><ChefDashboard initialTab="profile" /></AdminLayout></RequireChefAuth>} />

            <Route path="/" element={<RootRedirect />} />
            <Route path="/dashboard" element={<RootRedirect />} />
            <Route path="/orders" element={<Layout><Orders /></Layout>} />
            <Route path="/products" element={<Layout><Products /></Layout>} />
            <Route path="/branches" element={<Layout><Branches /></Layout>} />
            <Route path="/users" element={<Layout><Users /></Layout>} />
            <Route path="/reports" element={<Layout><Reports /></Layout>} />
            <Route path="/tables" element={<Layout><Tables /></Layout>} />
            <Route path="/notifications" element={<Layout><Notifications /></Layout>} />
            <Route path="/settings" element={<Layout><Settings /></Layout>} />
          </Routes>
        </Suspense>
        </TenantBrandingProvider>
      </Router>
    </SettingsProvider>
  );
}

export default App;
