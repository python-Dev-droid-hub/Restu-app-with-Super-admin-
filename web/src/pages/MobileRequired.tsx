import React from 'react';
import { useNavigate } from 'react-router-dom';

const MobileRequired: React.FC = () => {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole') || 'USER';

  const getRoleDisplayName = (role: string) => {
    const roleNames: Record<string, string> = {
      'CHEF': 'Chef',
      'WAITER': 'Waiter',
      'RIDER': 'Delivery Rider',
      'CUSTOMER': 'Customer',
      'BRANCH_MANAGER': 'Branch Manager'
    };
    return roleNames[role] || role;
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
    navigate('/login');
  };

  return (
    <div className="page-container">
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
        <div className="content-card" style={{ maxWidth: '600px', textAlign: 'center' }}>
          <div className="content-card-body">
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>
              📱
            </div>

            <h2 style={{ color: 'var(--primary)', marginBottom: '15px' }}>
              Mobile App Required
            </h2>

            <p style={{ fontSize: '1.1rem', marginBottom: '20px', color: 'var(--text-secondary)' }}>
              As a <strong>{getRoleDisplayName(userRole)}</strong>, you need to use our dedicated mobile app
              to access your dashboard and perform your tasks.
            </p>

            <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '8px', marginBottom: '25px' }}>
              <h3 style={{ marginBottom: '15px', color: 'var(--primary)' }}>📥 Download Our App</h3>

              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🍎</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>iOS App</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-hint)' }}>Coming Soon</div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🤖</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Android App</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-hint)' }}>Coming Soon</div>
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--status-info-light)', border: '1px solid var(--status-info)', padding: '15px', borderRadius: '6px', marginBottom: '25px' }}>
              <strong>💡 Note:</strong> Our web interface is currently available only for administrators.
              Mobile apps for {getRoleDisplayName(userRole)} will be available soon!
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={handleLogout}
                className="btn btn-outline"
              >
                🔙 Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileRequired;
