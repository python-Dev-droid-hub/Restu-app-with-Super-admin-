import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Avatar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
import { useTheme } from '@mui/material/styles';
import { useTenantBranding } from '../../context/TenantBrandingProvider';
import {
  adminPageContainerSx,
  adminPageHeaderSx,
  adminPrimaryButtonSx,
  responsiveTableContainerSx,
  useAdminBreakpoints,
} from '../../utils/adminResponsive';
import {
  Search,
  Delete,
  People,
  Email,
  Phone,
  Block,
  CheckCircle,
  Add,
} from '@mui/icons-material';
import { api } from '../../services/api';
import { useTenantPlan } from '../../hooks/useTenantPlan';

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

interface BranchItem {
  _id: string;
  name?: string;
  branchName?: string;
}

const AdminCustomers: React.FC = () => {
  const theme = useTheme();
  const { branding } = useTenantBranding();
  const { isMobile, isCompact } = useAdminBreakpoints();
  const primary = branding.primaryColor || theme.palette.primary.main;
  const primaryDark = theme.palette.primary.dark;
  const { canAddStaff, allowedStaffRoles, plan } = useTenantPlan();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [error, setError] = useState('');

  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addForm, setAddForm] = useState({
    displayName: '',
    email: '',
    password: '',
    phoneNumber: '',
    role: 'CUSTOMER',
    assignedBranchId: '',
    vehicleNumber: '',
    vehicleType: '',
  });
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const response: any = await api.getAllBranches();
      if (response?.success) {
        const raw = response?.data?.branches || response?.data?.data?.branches || response?.data || [];
        setBranches(Array.isArray(raw) ? raw : []);
      }
    } catch (err) {
      console.error('Error loading branches:', err);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = { showInactive: 'true' };
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
    const nextActive = !user.isActive;
    try {
      const response: any = await api.updateUser(user._id, { isActive: nextActive });
      if (response?.success) {
        const updated = response.data?.user || response.data;
        setUsers((prev) =>
          prev.map((u) =>
            u._id === user._id
              ? {
                  ...u,
                  isActive:
                    typeof updated?.isActive === 'boolean' ? updated.isActive : nextActive,
                }
              : u
          )
        );
      }
    } catch (err) {
      console.error('Error updating user:', err);
      setError('Failed to update user status');
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

  const resetAddForm = () => {
    setAddForm({
      displayName: '',
      email: '',
      password: '',
      phoneNumber: '',
      role: 'CUSTOMER',
      assignedBranchId: '',
      vehicleNumber: '',
      vehicleType: '',
    });
    setAddErrors({});
    setAddError('');
  };

  const staffRoleOptions = [
    { value: 'CUSTOMER', label: 'Customer' },
    { value: 'ADMIN', label: 'Admin' },
    { value: 'BRANCH_MANAGER', label: 'Branch Manager' },
    { value: 'CHEF', label: 'Chef' },
    { value: 'WAITER', label: 'Waiter' },
    { value: 'RIDER', label: 'Rider' },
  ].filter((r) => r.value === 'CUSTOMER' || allowedStaffRoles.includes(r.value));

  const openAddDialog = () => {
    resetAddForm();
    setAddOpen(true);
  };

  const closeAddDialog = () => {
    setAddOpen(false);
  };

  const validateAddForm = () => {
    const errs: Record<string, string> = {};
    if (!addForm.displayName.trim()) errs.displayName = 'Name is required';
    if (!addForm.email.trim()) errs.email = 'Email is required';
    if (!addForm.password) errs.password = 'Password is required';
    if (!addForm.role) errs.role = 'Role is required';

    const role = (addForm.role || '').toUpperCase();
    const needsBranch = ['WAITER', 'CHEF', 'BRANCH_MANAGER'].includes(role);
    if (needsBranch && !addForm.assignedBranchId) {
      errs.assignedBranchId = 'Branch is required for this role';
    }
    if (role === 'RIDER') {
      if (!addForm.vehicleNumber.trim()) errs.vehicleNumber = 'Vehicle number is required for riders';
      if (!addForm.vehicleType.trim()) errs.vehicleType = 'Vehicle type is required for riders';
    }
    setAddErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateUser = async () => {
    if (!validateAddForm()) return;
    try {
      setAddLoading(true);
      setAddError('');

      const payload: any = {
        name: addForm.displayName,
        email: addForm.email,
        password: addForm.password,
        role: (addForm.role || 'CUSTOMER').toUpperCase(),
        phoneNumber: addForm.phoneNumber || undefined,
        assignedBranchId: addForm.assignedBranchId || undefined,
        vehicleNumber: addForm.vehicleNumber || undefined,
        vehicleType: addForm.vehicleType || undefined,
      };

      const response: any = await api.post('/auth/register', payload);
      if (response?.success) {
        closeAddDialog();
        await loadUsers();
      } else {
        setAddError(response?.message || response?.error || 'Failed to create user');
      }
    } catch (err: any) {
      console.error('Error creating user:', err);
      setAddError(err?.message || 'Failed to create user');
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <Box sx={{ ...adminPageContainerSx, bgcolor: '#f8f5ff', minHeight: '100vh' }}>
      <Box sx={adminPageHeaderSx}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#333', fontSize: { xs: 22, sm: 28 } }}>
          Users & Customers
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={openAddDialog}
          disabled={!canAddStaff}
          fullWidth={isCompact}
          title={
            !canAddStaff
              ? `Staff limit reached (${plan.usage.staff}/${plan.maxStaffAccounts}) on ${plan.planName || 'your'} plan.`
              : undefined
          }
          sx={{ ...adminPrimaryButtonSx(primary, primaryDark), borderRadius: 2 }}
        >
          Add User
        </Button>
      </Box>

      <Dialog open={addOpen} onClose={closeAddDialog} fullWidth maxWidth="sm">
        <DialogTitle>Add User</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {addError && <Alert severity="error" sx={{ mb: 2 }}>{addError}</Alert>}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Name"
              value={addForm.displayName}
              onChange={(e) => setAddForm((p) => ({ ...p, displayName: e.target.value }))}
              error={!!addErrors.displayName}
              helperText={addErrors.displayName || ''}
              fullWidth
              size="small"
            />

            <TextField
              label="Email"
              value={addForm.email}
              onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))}
              error={!!addErrors.email}
              helperText={addErrors.email || ''}
              fullWidth
              size="small"
            />

            <TextField
              label="Password"
              type="password"
              value={addForm.password}
              onChange={(e) => setAddForm((p) => ({ ...p, password: e.target.value }))}
              error={!!addErrors.password}
              helperText={addErrors.password || ''}
              fullWidth
              size="small"
            />

            <TextField
              label="Phone Number"
              value={addForm.phoneNumber}
              onChange={(e) => setAddForm((p) => ({ ...p, phoneNumber: e.target.value }))}
              fullWidth
              size="small"
            />

            <FormControl fullWidth size="small" error={!!addErrors.role}>
              <Select
                value={addForm.role}
                onChange={(e) => {
                  const newRole = String(e.target.value || 'CUSTOMER');
                  setAddForm((p) => ({
                    ...p,
                    role: newRole,
                    assignedBranchId: ['WAITER', 'CHEF', 'BRANCH_MANAGER'].includes(newRole) ? p.assignedBranchId : '',
                    vehicleNumber: newRole === 'RIDER' ? p.vehicleNumber : '',
                    vehicleType: newRole === 'RIDER' ? p.vehicleType : '',
                  }));
                }}
                displayEmpty
              >
                {staffRoleOptions.map((r) => (
                  <MenuItem key={r.value} value={r.value}>
                    {r.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {addErrors.role && (
              <Typography sx={{ color: '#d32f2f', fontSize: 12, mt: -1 }}>
                {addErrors.role}
              </Typography>
            )}

            {['WAITER', 'CHEF', 'BRANCH_MANAGER'].includes(addForm.role) && (
              <FormControl fullWidth size="small" error={!!addErrors.assignedBranchId}>
                <Select
                  value={addForm.assignedBranchId}
                  onChange={(e) => setAddForm((p) => ({ ...p, assignedBranchId: String(e.target.value) }))}
                  displayEmpty
                >
                  <MenuItem value="">Select Branch</MenuItem>
                  {branches.map((b) => (
                    <MenuItem key={b._id} value={b._id}>
                      {b.branchName || b.name || 'Branch'}
                    </MenuItem>
                  ))}
                </Select>
                {addErrors.assignedBranchId && (
                  <Typography sx={{ color: '#d32f2f', fontSize: 12, mt: 0.5 }}>
                    {addErrors.assignedBranchId}
                  </Typography>
                )}
              </FormControl>
            )}

            {addForm.role === 'RIDER' && (
              <>
                <TextField
                  label="Vehicle Number"
                  value={addForm.vehicleNumber}
                  onChange={(e) => setAddForm((p) => ({ ...p, vehicleNumber: e.target.value }))}
                  error={!!addErrors.vehicleNumber}
                  helperText={addErrors.vehicleNumber || ''}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Vehicle Type"
                  value={addForm.vehicleType}
                  onChange={(e) => setAddForm((p) => ({ ...p, vehicleType: e.target.value }))}
                  error={!!addErrors.vehicleType}
                  helperText={addErrors.vehicleType || ''}
                  fullWidth
                  size="small"
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeAddDialog} disabled={addLoading} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateUser}
            disabled={addLoading}
            variant="contained"
            sx={{ textTransform: 'none', ...adminPrimaryButtonSx(primary, primaryDark) }}
          >
            {addLoading ? 'Creating...' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search users..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
          }}
          sx={{ flex: 1, minWidth: { xs: '100%', sm: 300 }, bgcolor: 'white', borderRadius: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 }, bgcolor: 'white', borderRadius: 1 }}>
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
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', ...responsiveTableContainerSx }}>
        <Table size={isMobile ? 'small' : 'medium'} sx={{ minWidth: isCompact ? 0 : 820 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
              {!isCompact && <TableCell sx={{ fontWeight: 600 }}>Contact</TableCell>}
              <TableCell sx={{ fontWeight: 600, display: { xs: 'none', md: 'table-cell' } }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, display: { xs: 'none', lg: 'table-cell' } }}>Joined</TableCell>
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                      <Avatar src={user.avatar ? api.getImageUrl(user.avatar) : undefined} sx={{ bgcolor: primary, flexShrink: 0 }}>
                        {user.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 500 }}>{user.name}</Typography>
                        {isCompact && (
                          <Box sx={{ mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', wordBreak: 'break-all' }}>
                              {user.email}
                            </Typography>
                            {user.phone && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {user.phone}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>
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
                  {!isCompact && (
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                        <Email sx={{ fontSize: 14, color: '#999', flexShrink: 0 }} />
                        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{user.email}</Typography>
                      </Box>
                      {user.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Phone sx={{ fontSize: 14, color: '#999', flexShrink: 0 }} />
                          <Typography variant="body2" color="#666">{user.phone}</Typography>
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  )}
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
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
                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
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
