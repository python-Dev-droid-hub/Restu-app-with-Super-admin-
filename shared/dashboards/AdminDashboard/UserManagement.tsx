import { useEffect, useState } from 'react';
import type { User } from '../../api/auth';
import { api } from '../../api/client';

interface UserWithId extends User {
  _id: string;
  isActive: boolean;
  createdAt: string;
}

interface UsersResponse {
  users: UserWithId[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function UserManagement() {
  const [users, setUsers] = useState<UserWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [_showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await api.get<UsersResponse>(`/users?${params.toString()}`);
      
      if (response.success && response.data) {
        setUsers(response.data.users);
      } else {
        setError(response.message || 'Failed to fetch users');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await api.delete(`/users/${userId}`);
      if (response.success) {
        setUsers(users.filter(user => user._id !== userId));
      } else {
        setError(response.message || 'Failed to delete user');
      }
    } catch (err) {
      setError('Failed to delete user');
      console.error('Error deleting user:', err);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await api.put(`/users/${userId}/deactivate`, { isActive: !currentStatus });
      if (response.success) {
        setUsers(users.map(user =>
          user._id === userId ? { ...user, isActive: !currentStatus } : user
        ));
      } else {
        setError(response.message || 'Failed to update user status');
      }
    } catch (err) {
      setError('Failed to update user status');
      console.error('Error updating user status:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div>Loading users...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header with actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <h2 style={{ margin: 0, color: '#1a1a2e' }}>User Management</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '12px 24px',
            backgroundColor: '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          ➕ Add User
        </button>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '14px', fontWeight: 500, color: '#666' }}>
            Search Users
          </label>
          <input
            type="text"
            placeholder="Search by email or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              minWidth: '250px',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '14px', fontWeight: 500, color: '#666' }}>
            Filter by Role
          </label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              minWidth: '150px',
            }}
          >
            <option value="all">All Roles</option>
            <option value="CUSTOMER">Customer</option>
            <option value="RIDER">Rider</option>
            <option value="WAITER">Waiter</option>
            <option value="CHEF">Chef</option>
            <option value="BRANCH_MANAGER">Branch Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '6px',
          border: '1px solid #ffcdd2',
        }}>
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: '12px',
              background: 'none',
              border: 'none',
              color: '#c62828',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Users table */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #eee',
          backgroundColor: '#f8f9fa',
        }}>
          <h3 style={{ margin: 0, color: '#1a1a2e' }}>
            Users ({filteredUsers.length})
          </h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px',
          }}>
            <thead>
              <tr style={{
                backgroundColor: '#f8f9fa',
                borderBottom: '2px solid #dee2e6',
              }}>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#495057' }}>
                  User
                </th>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#495057' }}>
                  Role
                </th>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#495057' }}>
                  Status
                </th>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: '#495057' }}>
                  Joined
                </th>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: 600, color: '#495057' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user._id} style={{
                  borderBottom: '1px solid #dee2e6',
                  backgroundColor: user.isActive ? '#fff' : '#f8f9fa',
                }}>
                  <td style={{ padding: '16px' }}>
                    <div>
                      <div style={{ fontWeight: 500, color: '#1a1a2e' }}>
                        {user.displayName || 'No name'}
                      </div>
                      <div style={{ color: '#6c757d', fontSize: '12px' }}>
                        {user.email}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 500,
                      backgroundColor: user.role === 'ADMIN' ? '#e3f2fd' :
                                     user.role === 'CUSTOMER' ? '#f3e5f5' :
                                     user.role === 'RIDER' ? '#fff3e0' :
                                     user.role === 'WAITER' ? '#fce4ec' :
                                     user.role === 'CHEF' ? '#f1f8e9' :
                                     user.role === 'BRANCH_MANAGER' ? '#e0f2f1' : '#e0f2f1',
                      color: user.role === 'ADMIN' ? '#1976d2' :
                             user.role === 'CUSTOMER' ? '#7b1fa2' :
                             user.role === 'RIDER' ? '#f57c00' :
                             user.role === 'WAITER' ? '#c2185b' :
                             user.role === 'CHEF' ? '#689f38' :
                             user.role === 'BRANCH_MANAGER' ? '#00796b' : '#00796b',
                    }}>
                      {user.role?.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 500,
                      backgroundColor: user.isActive ? '#e8f5e9' : '#ffebee',
                      color: user.isActive ? '#2e7d32' : '#c62828',
                    }}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '16px', color: '#6c757d' }}>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleToggleStatus(user._id, user.isActive)}
                        style={{
                          padding: '6px 12px',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          backgroundColor: user.isActive ? '#ffc107' : '#28a745',
                          color: user.isActive ? '#000' : '#fff',
                        }}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user._id)}
                        style={{
                          padding: '6px 12px',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          backgroundColor: '#dc3545',
                          color: '#fff',
                        }}
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

        {filteredUsers.length === 0 && (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#6c757d',
          }}>
            No users found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
}
