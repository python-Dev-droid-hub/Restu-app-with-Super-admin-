import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton,
  TextField,
  InputAdornment,
  FormControl,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import {
  Search,
  Delete,
  People,
  Email,
  Phone,
  Block,
  CheckCircle,
} from '@mui/icons-material';
import { api } from '../../services/api';

interface UserItem {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive?: boolean;
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
  orderCount?: number;
  totalSpent?: number;
}

const AdminCustomers: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (roleFilter !== 'all') params.role = roleFilter;
      
      const response: any = await api.getUsers(params);
      if (response?.success) {
        const rawUsers = response.data?.users || response.data || [];
        const normalized = rawUsers.map((u: any) => {
          let avatarUrl = u.avatar || u.profileImage || u.imageUrl || '';
          // Filter out invalid paths
          if (avatarUrl && (avatarUrl.startsWith('file://') || avatarUrl.includes('var/mobile') || avatarUrl.includes('ImagePicker'))) {
            avatarUrl = '';
          }
          return {
            _id: u._id || u.id,
            name: u.name || u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email?.split('@')[0] || 'Unknown',
            email: u.email || '',
            phone: u.phone || u.phoneNumber || '',
            role: u.role || 'CUSTOMER',
            isActive: u.isActive ?? true,
            avatar: avatarUrl,
            createdAt: u.createdAt || new Date().toISOString(),
            lastLogin: u.lastLogin || '',
            orderCount: u.orderCount || 0,
            totalSpent: u.totalSpent || 0,
          };
        });
        setUsers(normalized);
      }
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (user: UserItem) => {
    try {
      const response: any = await api.updateUser(user._id, { isActive: !user.isActive });
      if (response?.success) {
        loadUsers();
      }
    } catch (err) {
      console.error('Error updating user:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const response: any = await api.deleteUser(id);
      if (response?.success) {
        loadUsers();
      }
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return '#E3F2FD';
      case 'SUPER_ADMIN': return '#F3E5F5';
      case 'BRANCH_MANAGER': return '#E8F5E9';
      case 'CHEF': return '#FFF3E0';
      case 'RIDER': return '#FCE4EC';
      case 'WAITER': return '#E0F7FA';
      default: return '#F5F5F5';
    }
  };

  const getRoleTextColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return '#1976D2';
      case 'SUPER_ADMIN': return '#9C27B0';
      case 'BRANCH_MANAGER': return '#4CAF50';
      case 'CHEF': return '#FF9800';
      case 'RIDER': return '#E91E63';
      case 'WAITER': return '#00BCD4';
      default: return '#666';
    }
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#f8f5ff', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#333' }}>
          Users & Customers
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          placeholder="Search users..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
          }}
          sx={{ minWidth: 300, bgcolor: 'white', borderRadius: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 150, bgcolor: 'white', borderRadius: 1 }}>
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            displayEmpty
          >
            <MenuItem value="all">All Roles</MenuItem>
            <MenuItem value="CUSTOMER">Customers</MenuItem>
            <MenuItem value="ADMIN">Admins</MenuItem>
            <MenuItem value="BRANCH_MANAGER">Branch Managers</MenuItem>
            <MenuItem value="CHEF">Chefs</MenuItem>
            <MenuItem value="RIDER">Riders</MenuItem>
            <MenuItem value="WAITER">Waiters</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Users Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Contact</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Joined</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton variant="text" width={150} /></TableCell>
                  <TableCell><Skeleton variant="text" width={80} /></TableCell>
                  <TableCell><Skeleton variant="text" width={120} /></TableCell>
                  <TableCell><Skeleton variant="text" width={60} /></TableCell>
                  <TableCell><Skeleton variant="text" width={100} /></TableCell>
                  <TableCell><Skeleton variant="text" width={80} /></TableCell>
                </TableRow>
              ))
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <People sx={{ fontSize: 40, color: '#ccc', mb: 1 }} />
                  <Typography color="#999">No users found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user._id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar src={user.avatar ? api.getImageUrl(user.avatar) : undefined} sx={{ bgcolor: '#FF6B35' }}>
                        {user.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography sx={{ fontWeight: 500 }}>{user.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.role}
                      size="small"
                      sx={{
                        bgcolor: getRoleColor(user.role),
                        color: getRoleTextColor(user.role),
                        fontSize: 11,
                        fontWeight: 500,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Email sx={{ fontSize: 14, color: '#999' }} />
                        <Typography variant="body2">{user.email}</Typography>
                      </Box>
                      {user.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Phone sx={{ fontSize: 14, color: '#999' }} />
                          <Typography variant="body2" color="#666">{user.phone}</Typography>
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.isActive ? 'Active' : 'Inactive'}
                      size="small"
                      icon={user.isActive ? <CheckCircle /> : <Block />}
                      sx={{
                        bgcolor: user.isActive ? '#E8F5E9' : '#FFEBEE',
                        color: user.isActive ? '#4CAF50' : '#F44336',
                        fontSize: 11,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="#666">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleToggleActive(user)}>
                      {user.isActive ? <Block sx={{ fontSize: 18 }} /> : <CheckCircle sx={{ fontSize: 18 }} />}
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(user._id)}>
                      <Delete sx={{ fontSize: 18 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AdminCustomers;
