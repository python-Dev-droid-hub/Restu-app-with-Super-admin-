import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Skeleton,
} from '@mui/material';
import { Add, Edit, Delete, TableRestaurant } from '@mui/icons-material';
import { api } from '../../services/api';

interface TableItem {
  _id: string;
  tableNumber: string;
  seatingCapacity: number;
  capacity?: number; // fallback
  branch: string;
  branchId?: string;
  branchName?: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'OUT_OF_SERVICE';
  section?: string;
  floorNumber?: number;
  position?: { x: number; y: number };
}

interface Branch {
  _id: string;
  name?: string;
  branchName?: string;
}

const AdminTableAssignment: React.FC = () => {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [userRole, setUserRole] = useState<string>('');
  const [userBranchId, setUserBranchId] = useState<string>('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableItem | null>(null);
  const [formData, setFormData] = useState<{
    tableNumber: string;
    seatingCapacity: number;
    branch: string;
    status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'OUT_OF_SERVICE';
    section: string;
    floorNumber: number;
  }>({
    tableNumber: '',
    seatingCapacity: 4,
    branch: '',
    status: 'AVAILABLE',
    section: '',
    floorNumber: 1,
  });

  useEffect(() => {
    loadUserContext();
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedBranch, userRole, userBranchId]);

  const loadUserContext = () => {
    try {
      const raw = localStorage.getItem('userData');
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw);
      const role = parsed.role || '';
      const branchId = parsed.assignedBranch?._id || parsed.branch?._id || parsed.assigned_branch_id || parsed.branchId || '';
      setUserRole(role);
      setUserBranchId(branchId);
      if (role === 'BRANCH_MANAGER' && branchId) {
        setSelectedBranch(branchId);
      }
    } catch (e) {
      console.error('Error loading user context:', e);
      loadData();
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const effectiveBranchId = userRole === 'BRANCH_MANAGER' && userBranchId
        ? userBranchId
        : (selectedBranch !== 'all' ? selectedBranch : userBranchId);

      const [tablesRes, branchesRes]: [any, any] = await Promise.all([
        api.get(effectiveBranchId ? `/tables?branch=${encodeURIComponent(effectiveBranchId)}` : '/tables'),
        api.getAllBranches(),
      ]);

      if (tablesRes.success && tablesRes.data) {
        const rawTables = tablesRes.data.tables || tablesRes.data || [];
        const normalized = rawTables.map((t: any) => ({
          _id: t._id || t.id,
          tableNumber: t.tableNumber,
          seatingCapacity: t.seatingCapacity || t.capacity || 4,
          capacity: t.capacity,
          branch: t.branch?._id || t.branch || '',
          branchId: t.branch?._id || t.branch || '',
          branchName: t.branch?.branchName || t.branch?.name || '',
          status: (t.status || 'AVAILABLE').toUpperCase() as any,
          section: t.section || '',
          floorNumber: t.floorNumber || 1,
        }));
        setTables(normalized);
      }
      if (branchesRes.success && branchesRes.data) {
        setBranches(branchesRes.data.branches || branchesRes.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (table?: TableItem) => {
    if (table) {
      setEditingTable(table);
      setFormData({
        tableNumber: table.tableNumber,
        seatingCapacity: table.seatingCapacity || table.capacity || 4,
        branch: table.branch || table.branchId || '',
        status: table.status,
        section: table.section || '',
        floorNumber: table.floorNumber || 1,
      });
    } else {
      setEditingTable(null);
      setFormData({
        tableNumber: '',
        seatingCapacity: 4,
        branch: '',
        status: 'AVAILABLE',
        section: '',
        floorNumber: 1,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTable(null);
  };

  const handleSave = async () => {
    try {
      const saveData: any = {
        tableNumber: formData.tableNumber,
        seatingCapacity: formData.seatingCapacity,
        branch: formData.branch,
        status: formData.status,
        section: formData.section,
        floorNumber: formData.floorNumber,
      };
      if (editingTable) {
        await api.updateTable(editingTable._id, saveData);
      } else {
        await api.createTable(saveData);
      }
      handleCloseDialog();
      loadData();
    } catch (error) {
      console.error('Error saving table:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this table?')) {
      try {
        await api.deleteTable(id);
        loadData();
      } catch (error) {
        console.error('Error deleting table:', error);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'success';
      case 'OCCUPIED': return 'error';
      case 'RESERVED': return 'warning';
      case 'CLEANING': return 'info';
      case 'OUT_OF_SERVICE': return 'default';
      default: return 'default';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return '#e8f5e9';
      case 'OCCUPIED': return '#ffebee';
      case 'RESERVED': return '#fff3e0';
      case 'CLEANING': return '#e3f2fd';
      case 'OUT_OF_SERVICE': return '#f5f5f5';
      default: return '#ffffff';
    }
  };

  return (
    <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh', py: 3 }}>
      <Container maxWidth="xl">
        <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                Table Assignment
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                {userRole !== 'BRANCH_MANAGER' && (
                  <FormControl size="small" sx={{ minWidth: 200, bgcolor: 'white', borderRadius: 1 }}>
                    <InputLabel>Branch</InputLabel>
                    <Select
                      label="Branch"
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(String(e.target.value))}
                    >
                      <MenuItem value="all">All Branches</MenuItem>
                      {branches.map((b) => (
                        <MenuItem key={b._id} value={b._id}>
                          {b.branchName || b.name || 'Branch'}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleOpenDialog()}
                  sx={{ bgcolor: '#FF6B35', '&:hover': { bgcolor: '#e55a2b' } }}
                >
                  Add Table
                </Button>
              </Box>
            </Box>

            {loading ? (
              <Grid container spacing={2}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={i}>
                    <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Grid container spacing={2}>
                {tables.map((table) => (
                  <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={table._id}>
                    <Paper
                      elevation={2}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        textAlign: 'center',
                        bgcolor: getStatusBgColor(table.status),
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <TableRestaurant sx={{ fontSize: 40, color: '#FF6B35', mb: 1 }} />
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        Table {table.tableNumber}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {table.seatingCapacity || table.capacity || 4} seats
                      </Typography>
                      {table.section && (
                        <Typography variant="caption" color="textSecondary">
                          Section: {table.section}
                        </Typography>
                      )}
                      <Chip
                        label={table.status.replace('_', ' ')}
                        color={getStatusColor(table.status) as any}
                        size="small"
                        sx={{ mt: 1, mx: 'auto' }}
                      />
                      <Box sx={{ mt: 'auto', pt: 1, display: 'flex', justifyContent: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                        <IconButton size="small" onClick={() => handleOpenDialog(table)}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDelete(table._id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
                {tables.length === 0 && (
                  <Grid size={{ xs: 12 }}>
                    <Typography align="center" sx={{ py: 4, color: '#666' }}>
                      No tables found. Add your first table!
                    </Typography>
                  </Grid>
                )}
              </Grid>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>{editingTable ? 'Edit Table' : 'Add Table'}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Table Number"
              value={formData.tableNumber}
              onChange={(e) => setFormData({ ...formData, tableNumber: e.target.value })}
              sx={{ mt: 2 }}
            />
            <TextField
              fullWidth
              label="Seating Capacity"
              type="number"
              value={formData.seatingCapacity}
              onChange={(e) => setFormData({ ...formData, seatingCapacity: parseInt(e.target.value) || 4 })}
              sx={{ mt: 2 }}
            />
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={6}>
                <TextField
                  fullWidth
                  label="Section"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  sx={{ mt: 1 }}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  fullWidth
                  label="Floor"
                  type="number"
                  value={formData.floorNumber}
                  onChange={(e) => setFormData({ ...formData, floorNumber: parseInt(e.target.value) || 1 })}
                  sx={{ mt: 1 }}
                />
              </Grid>
            </Grid>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Branch</InputLabel>
              <Select
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                label="Branch"
              >
                {branches.map((branch) => (
                  <MenuItem key={branch._id} value={branch._id}>{branch.branchName || branch.name || 'Branch'}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                label="Status"
              >
                <MenuItem value="AVAILABLE">Available</MenuItem>
                <MenuItem value="OCCUPIED">Occupied</MenuItem>
                <MenuItem value="RESERVED">Reserved</MenuItem>
                <MenuItem value="CLEANING">Cleaning</MenuItem>
                <MenuItem value="OUT_OF_SERVICE">Out of Service</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSave} variant="contained" sx={{ bgcolor: '#FF6B35' }}>
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default AdminTableAssignment;
