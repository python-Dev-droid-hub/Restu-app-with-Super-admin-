import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface User {
  _id: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  role: 'ADMIN' | 'CHEF' | 'WAITER' | 'RIDER' | 'CUSTOMER';
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface UserResponse {
  users: User[];
  total?: number;
  page?: number;
  limit?: number;
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getAllUsers() as { success: boolean; data: UserResponse; error?: string };

      if (response.success && response.data) {
        setUsers(response.data.users || []);
      } else {
        setError(response.error || 'Failed to load users');
      }
    } catch (err: any) {
      console.error('Error loading users:', err);
      setError(err.message || 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to deactivate this user?')) {
      try {
        await api.deactivateUser(userId);
        await loadUsers();
      } catch (error) {
        console.error('Error deactivating user:', error);
      }
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) {
      try {
        await api.deleteUser(userId);
        await loadUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      ADMIN: 'badge-admin',
      CHEF: 'badge-chef',
      WAITER: 'badge-waiter',
      RIDER: 'badge-rider',
      CUSTOMER: 'badge-customer',
    };
    return colors[role] || 'badge-customer';
  };

  const filteredUsers = users.filter((user) => {
    const matchesRole = selectedRole === 'ALL' || user.role === selectedRole;
    const matchesSearch = searchTerm === '' ||
      user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phoneNumber?.includes(searchTerm);

    return matchesRole && matchesSearch;
  });

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Manage all system users</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-outline" onClick={loadUsers}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Page Content */}
      <div className="page-content">
        {error && (
          <div className="alert alert-error" style={{ 
            padding: '15px 20px',
            borderRadius: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                {error.includes('401') || error.includes('Unauthorized') ? (
                  <>
                    <strong>🔒 Authentication Required:</strong> Please log in to view users
                  </>
                ) : (
                  <>
                    <strong>⚠️ Error:</strong> {error}
                  </>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {(error.includes('401') || error.includes('Unauthorized')) && (
                  <button 
                    onClick={() => window.location.href = '/login'} 
                    className="btn btn-primary"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    🔐 Log In
                  </button>
                )}
                <button 
                  onClick={loadUsers} 
                  className="btn btn-outline"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  🔄 Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-icon" style={{background: 'var(--primary-light)'}}>
                👥
              </div>
            </div>
            <div className="stat-card-content">
              <p className="stat-card-label">Total Users</p>
              <h3 className="stat-card-value">{users.length}</h3>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-icon" style={{background: '#E8F5E9'}}>
                ✅
              </div>
            </div>
            <div className="stat-card-content">
              <p className="stat-card-label">Active Users</p>
              <h3 className="stat-card-value">{users.filter(u => u.isActive).length}</h3>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-icon" style={{background: '#E3F2FD'}}>
                🛒
              </div>
            </div>
            <div className="stat-card-content">
              <p className="stat-card-label">Branch Users</p>
              <h3 className="stat-card-value">{users.filter(u => u.role === 'CUSTOMER').length}</h3>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-icon" style={{background: '#FFF3E0'}}>
                👔
              </div>
            </div>
            <div className="stat-card-content">
              <p className="stat-card-label">Staff</p>
              <h3 className="stat-card-value">{users.filter(u => ['CHEF', 'WAITER', 'RIDER'].includes(u.role)).length}</h3>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="filters-bar">
          <div className="filter-item">
            <label className="filter-label">Role</label>
            <select
              className="form-select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{ minWidth: '150px' }}
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="CHEF">Chef</option>
              <option value="WAITER">Waiter</option>
              <option value="RIDER">Rider</option>
              <option value="CUSTOMER">Customer</option>
            </select>
          </div>

          <div className="filter-item" style={{ flex: 1 }}>
            <label className="filter-label">Search</label>
            <input
              type="text"
              className="form-input"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', minWidth: '250px' }}
            />
          </div>
        </div>

        {/* Users Table Card */}
        <div className="content-card">
          <div className="content-card-header">
            <h2 className="content-card-title">All Users</h2>
            <div className="content-card-actions">
              <span className="text-secondary">{filteredUsers.length} users found</span>
            </div>
          </div>
          <div className="content-card-body no-padding">
            {filteredUsers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👥</div>
                <h3 className="empty-state-title">No users found</h3>
                <p className="empty-state-message">
                  {searchTerm || selectedRole !== 'ALL'
                    ? 'Try adjusting your filters'
                    : 'No users have been registered yet'
                  }
                </p>
              </div>
            ) : (
              <div className="users-table-container">
                <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user._id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">
                            {user.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="user-info">
                            <div className="user-name">{user.displayName}</div>
                            <div className="user-email">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        {user.phoneNumber ? (
                          <div className="contact-info">
                            📞 {user.phoneNumber}
                          </div>
                        ) : (
                          <span className="no-data">No phone</span>
                        )}
                      </td>
                      <td>
                        <span className={`status ${user.isActive ? 'active' : 'inactive'}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        {user.lastLogin ? (
                          new Date(user.lastLogin).toLocaleDateString()
                        ) : (
                          <span className="no-data">Never</span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => handleDeactivateUser(user._id)}
                            disabled={!user.isActive}
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            className="btn btn-outline btn-sm danger"
                            onClick={() => handleDeleteUser(user._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Users;
