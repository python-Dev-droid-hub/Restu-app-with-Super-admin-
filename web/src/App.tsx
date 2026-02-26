import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
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
import './styles/variables.css';
import './components/Layout.css';
import './pages/Dashboard.css';
import './styles/components.css';
import './styles/StandardLayout.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/mobile-required" element={<MobileRequired />} />
        <Route path="/" element={<Layout><Dashboard /></Layout>} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
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
  );
}

export default App;
