import { useEffect, useState } from 'react';
import { api } from '../../api/client';

interface Branch {
  _id: string;
  branchName: string;
  branchCode: string;
}

interface Waiter {
  _id: string;
  displayName: string;
  email: string;
}

interface Table {
  _id: string;
  tableNumber: string;
  seatingCapacity: number;
  section?: string;
  floorNumber: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'OUT_OF_SERVICE';
  branch?: Branch;
  currentWaiter?: Waiter;
  createdAt: string;
}

interface TablesResponse {
  tables: Table[];
}

interface BranchesResponse {
  branches: Branch[];
}

interface UsersResponse {
  users: Waiter[];
}

export function TableManagement() {
  const [tables, setTables] = useState<Table[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);

  const [newTable, setNewTable] = useState({
    branch: '',
    tableNumber: '',
    seatingCapacity: 4,
    section: '',
    floorNumber: 1,
    status: 'AVAILABLE' as const,
  });

  useEffect(() => {
    fetchTables();
    fetchBranches();
    fetchWaiters();
  }, [statusFilter, branchFilter]);

  const fetchTables = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (branchFilter !== 'all') params.append('branch', branchFilter);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await api.get<TablesResponse>(`/tables?${params.toString()}`);
      
      if (response.success && response.data) {
        setTables(response.data.tables || []);
      } else {
        setError(response.message || 'Failed to fetch tables');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tables');
      console.error('Error fetching tables:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await api.get<BranchesResponse>('/restaurants');
      if (response.success && response.data) {
        setBranches(response.data.branches || []);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  };

  const fetchWaiters = async () => {
    try {
      const response = await api.get<UsersResponse>('/users?role=WAITER');
      if (response.success && response.data) {
        setWaiters(response.data.users || []);
      }
    } catch (err) {
      console.error('Error fetching waiters:', err);
    }
  };

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTable.branch || !newTable.tableNumber) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setCreateLoading(true);

      const response = await api.post('/tables', newTable);

      if (response.success) {
        setShowCreateModal(false);
        setNewTable({
          branch: '',
          tableNumber: '',
          seatingCapacity: 4,
          section: '',
          floorNumber: 1,
          status: 'AVAILABLE',
        });
        fetchTables();
        alert('Table created successfully!');
      } else {
        alert(response.message || 'Failed to create table');
      }
    } catch (err) {
      console.error('Error creating table:', err);
      alert('Failed to create table. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!confirm('Are you sure you want to delete this table?')) return;

    try {
      const response = await api.delete(`/tables/${tableId}`);
      if (response.success) {
        setTables(tables.filter(table => table._id !== tableId));
        alert('Table deleted successfully!');
      } else {
        setError(response.message || 'Failed to delete table');
      }
    } catch (err) {
      setError('Failed to delete table');
      console.error('Error deleting table:', err);
    }
  };

  const handleAssignWaiter = async (waiterId: string) => {
    if (!selectedTable) return;

    try {
      setAssignLoading(true);
      const response = await api.put(`/tables/${selectedTable._id}/assign-waiter`, { waiterId });

      if (response.success) {
        setShowAssignModal(false);
        setSelectedTable(null);
        fetchTables();
        alert('Waiter assigned successfully!');
      } else {
        alert(response.message || 'Failed to assign waiter');
      }
    } catch (err) {
      console.error('Error assigning waiter:', err);
      alert('Failed to assign waiter. Please try again.');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRemoveWaiter = async (tableId: string) => {
    try {
      const response = await api.put(`/tables/${tableId}/remove-waiter`, {});
      if (response.success) {
        fetchTables();
        alert('Waiter removed successfully!');
      } else {
        alert(response.message || 'Failed to remove waiter');
      }
    } catch (err) {
      console.error('Error removing waiter:', err);
      alert('Failed to remove waiter. Please try again.');
    }
  };

  const openAssignModal = (table: Table) => {
    setSelectedTable(table);
    setShowAssignModal(true);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      AVAILABLE: '#4caf50',
      OCCUPIED: '#ff5722',
      RESERVED: '#9c27b0',
      CLEANING: '#ff9800',
      OUT_OF_SERVICE: '#757575',
    };
    return colors[status] || '#757575';
  };

  const filteredTables = tables.filter(table => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      table.tableNumber?.toLowerCase().includes(searchLower) ||
      table.section?.toLowerCase().includes(searchLower) ||
      table.branch?.branchName?.toLowerCase().includes(searchLower);
    const matchesStatus = statusFilter === 'all' || table.status === statusFilter;
    const matchesBranch = branchFilter === 'all' || table.branch?._id === branchFilter;
    return matchesSearch && matchesStatus && matchesBranch;
  });

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div>Loading tables...</div>
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
        <h2 style={{ margin: 0, color: '#1a1a2e' }}>Table Management ({tables.length})</h2>
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
          ➕ Add Table
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
            Search Tables
          </label>
          <input
            type="text"
            placeholder="Search by number, section..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onBlur={fetchTables}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              minWidth: '200px',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '14px', fontWeight: 500, color: '#666' }}>
            Filter by Branch
          </label>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              minWidth: '150px',
            }}
          >
            <option value="all">All Branches</option>
            {branches.map(branch => (
              <option key={branch._id} value={branch._id}>{branch.branchName}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '14px', fontWeight: 500, color: '#666' }}>
            Filter by Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              minWidth: '150px',
            }}
          >
            <option value="all">All Status</option>
            <option value="AVAILABLE">Available</option>
            <option value="OCCUPIED">Occupied</option>
            <option value="RESERVED">Reserved</option>
            <option value="CLEANING">Cleaning</option>
            <option value="OUT_OF_SERVICE">Out of Service</option>
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

      {/* Tables grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px',
      }}>
        {filteredTables.map((table) => (
          <div key={table._id} style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: '1px solid #eee',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '12px',
            }}>
              <div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#1a1a2e',
                }}>
                  Table {table.tableNumber}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#666',
                  marginTop: '2px',
                }}>
                  {table.branch?.branchName || 'No branch'}
                </div>
              </div>
              <span style={{
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: getStatusColor(table.status) + '20',
                color: getStatusColor(table.status),
                textTransform: 'capitalize',
              }}>
                {table.status.toLowerCase().replace('_', ' ')}
              </span>
            </div>

            <div style={{
              display: 'flex',
              gap: '16px',
              marginBottom: '12px',
              fontSize: '13px',
              color: '#666',
            }}>
              <span>🪑 Capacity: {table.seatingCapacity}</span>
              <span>🏢 Floor: {table.floorNumber}</span>
            </div>

            {table.section && (
              <div style={{
                fontSize: '13px',
                color: '#666',
                marginBottom: '12px',
              }}>
                📍 Section: {table.section}
              </div>
            )}

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              padding: '8px',
              backgroundColor: table.currentWaiter ? '#e8f5e9' : '#f5f5f5',
              borderRadius: '8px',
            }}>
              <span style={{ fontSize: '13px', color: '#666' }}>
                {table.currentWaiter ? `👤 ${table.currentWaiter.displayName}` : '👤 No waiter assigned'}
              </span>
            </div>

            <div style={{
              display: 'flex',
              gap: '8px',
            }}>
              {table.currentWaiter ? (
                <button
                  onClick={() => handleRemoveWaiter(table._id)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    backgroundColor: '#ffebee',
                    color: '#c62828',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  Remove Waiter
                </button>
              ) : (
                <button
                  onClick={() => openAssignModal(table)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    backgroundColor: '#e3f2fd',
                    color: '#1976d2',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  Assign Waiter
                </button>
              )}
              <button
                onClick={() => handleDeleteTable(table._id)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#ffebee',
                  color: '#c62828',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredTables.length === 0 && (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#666',
        }}>
          No tables found matching your criteria.
        </div>
      )}

      {/* Create Table Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, color: '#1a1a2e' }}>Add New Table</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateTable}>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                    Branch *
                  </label>
                  <select
                    value={newTable.branch}
                    onChange={(e) => setNewTable({ ...newTable, branch: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  >
                    <option value="">Select Branch</option>
                    {branches.map(branch => (
                      <option key={branch._id} value={branch._id}>{branch.branchName}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                      Table Number *
                    </label>
                    <input
                      type="text"
                      value={newTable.tableNumber}
                      onChange={(e) => setNewTable({ ...newTable, tableNumber: e.target.value })}
                      required
                      placeholder="e.g., A1, B2"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                      Seating Capacity *
                    </label>
                    <input
                      type="number"
                      value={newTable.seatingCapacity}
                      onChange={(e) => setNewTable({ ...newTable, seatingCapacity: parseInt(e.target.value) || 1 })}
                      min="1"
                      max="20"
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                      Section
                    </label>
                    <input
                      type="text"
                      value={newTable.section}
                      onChange={(e) => setNewTable({ ...newTable, section: e.target.value })}
                      placeholder="e.g., Patio, Main"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                      Floor Number
                    </label>
                    <input
                      type="number"
                      value={newTable.floorNumber}
                      onChange={(e) => setNewTable({ ...newTable, floorNumber: parseInt(e.target.value) || 1 })}
                      min="1"
                      max="10"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                    Status
                  </label>
                  <select
                    value={newTable.status}
                    onChange={(e) => setNewTable({ ...newTable, status: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="OCCUPIED">Occupied</option>
                    <option value="RESERVED">Reserved</option>
                    <option value="CLEANING">Cleaning</option>
                    <option value="OUT_OF_SERVICE">Out of Service</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#f5f5f5',
                      color: '#666',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: createLoading ? '#ccc' : '#1976d2',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: createLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                  >
                    {createLoading ? 'Creating...' : 'Create Table'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Waiter Modal */}
      {showAssignModal && selectedTable && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '400px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, color: '#1a1a2e' }}>
                Assign Waiter to Table {selectedTable.tableNumber}
              </h3>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedTable(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ maxHeight: '300px', overflow: 'auto' }}>
              {waiters.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  No waiters available. Please add waiters first.
                </div>
              ) : (
                waiters.map(waiter => (
                  <button
                    key={waiter._id}
                    onClick={() => handleAssignWaiter(waiter._id)}
                    disabled={assignLoading}
                    style={{
                      width: '100%',
                      padding: '12px',
                      marginBottom: '8px',
                      backgroundColor: '#f5f5f5',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: assignLoading ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      opacity: assignLoading ? 0.6 : 1,
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '16px',
                      backgroundColor: '#1976d2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: 500,
                    }}>
                      {waiter.displayName?.charAt(0).toUpperCase() || 'W'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, color: '#1a1a2e' }}>{waiter.displayName}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{waiter.email}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
