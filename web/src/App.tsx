import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { SettingsProvider } from './context/SettingsContext';
import Layout from './components/Layout';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Branches from './pages/Branches';
import Users from './pages/Users';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Tables from './pages/Tables';
import Notifications from './pages/Notifications';
import { Login } from './pages/Login';
import MobileRequired from './pages/MobileRequired';

// MUI Admin Panel Components
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminBranches from './pages/admin/AdminBranches';
import AdminOrders from './pages/admin/AdminOrders';
import AdminRiders from './pages/admin/AdminRiders';
import AdminKitchens from './pages/admin/AdminKitchens';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminCategories from './pages/admin/AdminCategories';
import AdminProducts from './pages/admin/AdminProducts';
import AdminCoupons from './pages/admin/AdminCoupons';
import AdminDealCampaigns from './pages/admin/AdminDealCampaigns';
import AdminReports from './pages/admin/AdminReports';
import AdminSettings from './pages/admin/AdminSettings';
import AdminProductSize from './pages/admin/AdminProductSize';
import AdminTableAssignment from './pages/admin/AdminTableAssignment';
import AdminBanners from './pages/admin/AdminBanners';

import CustomerLayout from './components/customer/CustomerLayout';
import CustomerHome from './pages/customer/CustomerHome';
import CustomerMenu from './pages/customer/CustomerMenu';
import CustomerCart from './pages/customer/CustomerCart';
import CustomerOrders from './pages/customer/CustomerOrders';
import CheckoutPage from './pages/customer/CheckoutPage';

import './styles/variables.css';
import './components/Layout.css';
import './pages/Dashboard.css';
import './styles/components.css';
import './styles/StandardLayout.css';

function RequireAdminAuth({ children }: { children: ReactElement }) {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('authToken');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RootRedirect() {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('authToken');
  const role = localStorage.getItem('userRole');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to="/customer" replace />;
}

function App() {
  return (
    <SettingsProvider>
      <Router>
        <Routes>
        {/* Login & Mobile Required */}
        <Route path="/login" element={<Login />} />
        <Route path="/mobile-required" element={<MobileRequired />} />

        {/* Customer Web Routes */}
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

        {/* New MUI Admin Panel Routes */}
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

        {/* Legacy Routes */}
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
      </Router>
    </SettingsProvider>
  );
}

export default App;
