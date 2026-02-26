import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Branch {
  _id: string;
  branchCode: string;
  branchName: string;
  addressLine: string;
  city: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phoneNumber?: string;
  email?: string;
  acceptsDelivery: boolean;
  acceptsDineIn: boolean;
  acceptsTakeaway: boolean;
  isActive: boolean;
  createdAt: string;
}

interface BranchesResponse {
  branches: Branch[];
  total?: number;
}

const Branches: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({
    branchCode: '',
    branchName: '',
    addressLine: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    phoneNumber: '',
    email: '',
    acceptsDelivery: true,
    acceptsDineIn: true,
    acceptsTakeaway: true,
  });

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getAllRestaurants();
      console.log('Branches API response:', response);

      if (response.success && response.data) {
        const branchesData = response.data as BranchesResponse;
        setBranches(branchesData.branches || []);
      } else {
        setError(response.error || 'Failed to load branches');
      }
    } catch (err: any) {
      console.error('Error loading branches:', err);
      setError(err.message || 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      branchCode: '',
      branchName: '',
      addressLine: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      phoneNumber: '',
      email: '',
      acceptsDelivery: true,
      acceptsDineIn: true,
      acceptsTakeaway: true,
    });
    setEditingBranch(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const branchData = {
      branchCode: formData.branchCode.toUpperCase(),
      branchName: formData.branchName,
      addressLine: formData.addressLine,
      city: formData.city,
      state: formData.state || undefined,
      postalCode: formData.postalCode || undefined,
      country: formData.country || 'Pakistan',
      phoneNumber: formData.phoneNumber || undefined,
      email: formData.email || undefined,
      acceptsDelivery: formData.acceptsDelivery,
      acceptsDineIn: formData.acceptsDineIn,
      acceptsTakeaway: formData.acceptsTakeaway,
    };

    try {
      if (editingBranch) {
        await api.updateRestaurant(editingBranch._id, branchData);
      } else {
        await api.createRestaurant(branchData);
      }

      await loadBranches();
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving branch:', error);
    }
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      branchCode: branch.branchCode,
      branchName: branch.branchName,
      addressLine: branch.addressLine,
      city: branch.city,
      state: branch.state || '',
      postalCode: branch.postalCode || '',
      country: branch.country || '',
      phoneNumber: branch.phoneNumber || '',
      email: branch.email || '',
      acceptsDelivery: branch.acceptsDelivery,
      acceptsDineIn: branch.acceptsDineIn,
      acceptsTakeaway: branch.acceptsTakeaway,
    });
    setShowAddModal(true);
  };

  const handleDelete = async (branchId: string) => {
    if (window.confirm('Are you sure you want to delete this branch? This action cannot be undone.')) {
      try {
        await api.deleteRestaurant(branchId);
        await loadBranches();
      } catch (error) {
        console.error('Error deleting branch:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading">Loading branches...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Branches</h1>
          <p className="page-subtitle">Manage restaurant locations</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + Add Branch
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
                    <strong>🔒 Authentication Required:</strong> Please log in to view branches
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
                  onClick={loadBranches} 
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
                🏢
              </div>
            </div>
            <div className="stat-card-content">
              <p className="stat-card-label">Total Branches</p>
              <h3 className="stat-card-value">{branches.length}</h3>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-icon" style={{background: '#E8F5E9'}}>
                ✅
              </div>
            </div>
            <div className="stat-card-content">
              <p className="stat-card-label">Active</p>
              <h3 className="stat-card-value">{branches.filter(b => b.isActive).length}</h3>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-icon" style={{background: '#E3F2FD'}}>
                🚚
              </div>
            </div>
            <div className="stat-card-content">
              <p className="stat-card-label">Delivery</p>
              <h3 className="stat-card-value">{branches.filter(b => b.acceptsDelivery).length}</h3>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-icon" style={{background: '#FFF3E0'}}>
                🪑
              </div>
            </div>
            <div className="stat-card-content">
              <p className="stat-card-label">Dine-in</p>
              <h3 className="stat-card-value">{branches.filter(b => b.acceptsDineIn).length}</h3>
            </div>
          </div>
        </div>

        {/* Branches Card */}
        <div className="content-card">
          <div className="content-card-header">
            <h2 className="content-card-title">All Branches</h2>
            <div className="content-card-actions">
              <span className="text-secondary">{branches.length} branches</span>
            </div>
          </div>
          <div className="content-card-body">
            {branches.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏢</div>
                <h3 className="empty-state-title">No branches found</h3>
                <p className="empty-state-message">Get started by adding your first branch</p>
                <button className="btn btn-primary empty-state-action" onClick={() => setShowAddModal(true)}>
                  Add Branch
                </button>
              </div>
            ) : (
              <div className="branches-grid">
                {branches.map((branch) => (
                  <div key={branch._id} className="branch-card">
                    <div className="branch-header">
                      <div className="branch-code">{branch.branchCode}</div>
                      <div className="branch-status">
                        <span className={`status ${branch.isActive ? 'active' : 'inactive'}`}>
                          {branch.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                    <h3 className="branch-name">{branch.branchName}</h3>

                    <div className="branch-address">
                      <div className="address-line">📍 {branch.addressLine}</div>
                      <div className="address-city">{branch.city}, {branch.state}</div>
                      {branch.postalCode && <div className="address-postal">{branch.postalCode}</div>}
                    </div>

                    <div className="branch-contact">
                      {branch.phoneNumber && <div className="contact-item">📞 {branch.phoneNumber}</div>}
                      {branch.email && <div className="contact-item">✉️ {branch.email}</div>}
                    </div>

                    <div className="branch-services">
                      <div className="service-tags">
                        {branch.acceptsDelivery && <span className="service-tag delivery">🚚 Delivery</span>}
                        {branch.acceptsDineIn && <span className="service-tag dine-in">🪑 Dine-in</span>}
                        {branch.acceptsTakeaway && <span className="service-tag takeaway">🥡 Takeaway</span>}
                      </div>
                    </div>

                    <div className="branch-actions">
                      <button className="btn btn-outline btn-sm" onClick={() => handleEdit(branch)}>
                        Edit
                      </button>
                      <button className="btn btn-outline btn-sm danger" onClick={() => handleDelete(branch._id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3>{editingBranch ? 'Edit Branch' : 'Add New Branch'}</h3>
              <button className="modal-close" onClick={() => { setShowAddModal(false); resetForm(); }}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Branch Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.branchCode}
                    onChange={(e) => setFormData({ ...formData, branchCode: e.target.value.toUpperCase() })}
                    placeholder="e.g., AB123"
                    pattern="[A-Z]{2}\d{3}"
                    required
                  />
                  <small className="form-hint">Format: XX999 (e.g., AB123)</small>
                </div>

                <div className="form-group">
                  <label className="form-label">Branch Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.branchName}
                    onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                    placeholder="e.g., Main Branch"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Address Line</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.addressLine}
                  onChange={(e) => setFormData({ ...formData, addressLine: e.target.value })}
                  placeholder="Street address"
                  required
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">State/Province</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="State or province"
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Postal Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    placeholder="Postal/ZIP code"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Country</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Country"
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    placeholder="+92xxxxxxxxxx"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="branch@example.com"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Services Offered</label>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.acceptsDelivery}
                      onChange={(e) => setFormData({ ...formData, acceptsDelivery: e.target.checked })}
                    />
                    🚚 Delivery
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.acceptsDineIn}
                      onChange={(e) => setFormData({ ...formData, acceptsDineIn: e.target.checked })}
                    />
                    🪑 Dine-in
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.acceptsTakeaway}
                      onChange={(e) => setFormData({ ...formData, acceptsTakeaway: e.target.checked })}
                    />
                    🥡 Takeaway
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => { setShowAddModal(false); resetForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingBranch ? 'Update Branch' : 'Add Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Branches;
