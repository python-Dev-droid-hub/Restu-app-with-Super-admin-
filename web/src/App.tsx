import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

import './styles/variables.css';
import './components/Layout.css';
import './pages/Dashboard.css';
import './styles/components.css';
import './styles/StandardLayout.css';

function App() {
  return (
    <SettingsProvider>
      <Router>
        <Routes>
        {/* Login & Mobile Required */}
        <Route path="/login" element={<Login />} />
        <Route path="/mobile-required" element={<MobileRequired />} />

        {/* New MUI Admin Panel Routes */}
        <Route path="/admin/dashboard" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
        <Route path="/admin/branches" element={<AdminLayout><AdminBranches /></AdminLayout>} />
        <Route path="/admin/orders" element={<AdminLayout><AdminOrders /></AdminLayout>} />
        <Route path="/admin/riders" element={<AdminLayout><AdminRiders /></AdminLayout>} />
        <Route path="/admin/kitchens" element={<AdminLayout><AdminKitchens /></AdminLayout>} />
        <Route path="/admin/customers" element={<AdminLayout><AdminCustomers /></AdminLayout>} />
        <Route path="/admin/notifications" element={<AdminLayout><AdminNotifications /></AdminLayout>} />
        <Route path="/admin/categories" element={<AdminLayout><AdminCategories /></AdminLayout>} />
        <Route path="/admin/products" element={<AdminLayout><AdminProducts /></AdminLayout>} />
        <Route path="/admin/coupons" element={<AdminLayout><AdminCoupons /></AdminLayout>} />
        <Route path="/admin/deals" element={<AdminLayout><AdminDealCampaigns /></AdminLayout>} />
        <Route path="/admin/deal-campaigns" element={<AdminLayout><AdminDealCampaigns /></AdminLayout>} />
        <Route path="/admin/product-size" element={<AdminLayout><AdminProductSize /></AdminLayout>} />
        <Route path="/admin/table-assignment" element={<AdminLayout><AdminTableAssignment /></AdminLayout>} />
        <Route path="/admin/banners" element={<AdminLayout><AdminBanners /></AdminLayout>} />
        <Route path="/admin/reports" element={<AdminLayout><AdminReports /></AdminLayout>} />
        <Route path="/admin/settings" element={<AdminLayout><AdminSettings /></AdminLayout>} />

        {/* Legacy Routes */}
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
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
