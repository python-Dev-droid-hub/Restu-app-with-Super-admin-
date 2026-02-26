import { useEffect, useState } from 'react';
import { api } from '../../api/client';

interface Branch {
  _id: string;
  branchCode: string;
  branchName: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  phoneNumber: string;
  email: string;
  branchManager?: {
    _id: string;
    displayName: string;
    email: string;
  };
  isActive: boolean;
  createdAt: string;
}

interface BranchesResponse {
  branches: Branch[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function RestaurantManagement() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const [newRestaurant, setNewRestaurant] = useState({
    name: '',
    description: '',
    phone: '',
    email: '',
    cuisine: [] as string[],
    priceRange: '$',
    deliveryTime: 30,
    deliveryFee: 0,
    minOrderAmount: 0,
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
    },
  });

  useEffect(() => {
    fetchBranches();
  }, [searchTerm, statusFilter]);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await api.get<BranchesResponse>(`/restaurants?${params.toString()}`);
      
      if (response.success && response.data) {
        setBranches(response.data.branches);
      } else {
        setError(response.message || 'Failed to fetch branches');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch branches');
      console.error('Error fetching branches:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRestaurant.name || !newRestaurant.email || !newRestaurant.phone) {
      alert('Please fill in all required fields');
      return;
    }
    if (newRestaurant.cuisine.length === 0) {
      alert('Please select at least one cuisine type');
      return;
    }
    if (!newRestaurant.description || newRestaurant.description.trim().length < 10) {
      alert('Please provide a description with at least 10 characters');
      return;
    }

    try {
      setCreateLoading(true);
      
      const restaurantData = {
        branchCode: `BR${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`, // Auto-generate branch code
        branchName: newRestaurant.name,
        addressLine: newRestaurant.address.street,
        city: newRestaurant.address.city,
        state: newRestaurant.address.state,
        postalCode: newRestaurant.address.zipCode,
        phoneNumber: newRestaurant.phone,
        email: newRestaurant.email,
        operatingHours: {
          monday: { open: '09:00', close: '22:00', isOpen: true },
          tuesday: { open: '09:00', close: '22:00', isOpen: true },
          wednesday: { open: '09:00', close: '22:00', isOpen: true },
          thursday: { open: '09:00', close: '22:00', isOpen: true },
          friday: { open: '09:00', close: '22:00', isOpen: true },
          saturday: { open: '09:00', close: '22:00', isOpen: true },
          sunday: { open: '10:00', close: '20:00', isOpen: true },
        },
        deliveryRadius: 5000,
        acceptsDelivery: true,
        acceptsDineIn: true,
        acceptsTakeaway: true,
      };

      const response = await api.post('/restaurants', restaurantData);
      
      if (response.success) {
        setShowCreateModal(false);
        setNewRestaurant({
          name: '',
          description: '',
          phone: '',
          email: '',
          cuisine: [],
          priceRange: '$',
          deliveryTime: 30,
          deliveryFee: 0,
          minOrderAmount: 0,
          address: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
          },
        });
        fetchBranches(); // Refresh the list
        alert('Restaurant created successfully!');
      } else {
        alert(response.message || 'Failed to create restaurant');
      }
    } catch (err) {
      console.error('Error creating restaurant:', err);
      alert('Failed to create restaurant. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  };

  const updateNewRestaurant = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setNewRestaurant(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev] as any,
          [child]: value,
        },
      }));
    } else {
      setNewRestaurant(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const filteredBranches = branches?.filter(branch => {
    const searchLower = searchTerm?.toLowerCase() || '';
    const matchesSearch = branch.branchName?.toLowerCase().includes(searchLower) ||
                         branch.branchCode?.toLowerCase().includes(searchLower) ||
                         branch.email?.toLowerCase().includes(searchLower) ||
                         branch.city?.toLowerCase().includes(searchLower);
    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'active' && branch.isActive) ||
                         (statusFilter === 'inactive' && !branch.isActive);
    return matchesSearch && matchesStatus;
  }) || [];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
        <div>Loading branches...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#dc3545' }}>
        <div>Error: {error}</div>
        <button onClick={fetchBranches} style={{ marginTop: '16px', padding: '8px 16px' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, color: '#1a1a2e' }}>Branch Management ({branches?.length || 0})</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          + Add Restaurant
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <input
          type="text"
          placeholder="Search restaurants..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, padding: '10px 16px', border: '1px solid #ddd', borderRadius: '6px' }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '10px 16px', border: '1px solid #ddd', borderRadius: '6px' }}
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button onClick={fetchBranches} style={{ padding: '10px 20px', backgroundColor: '#1976d2', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          Refresh
        </button>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#666' }}>Code</th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#666' }}>Branch Name</th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#666' }}>Location</th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#666' }}>Status</th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#666' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBranches.map((branch) => (
              <tr key={branch._id} style={{ borderTop: '1px solid #eee' }}>
                <td style={{ padding: '16px', fontWeight: 500 }}>{branch.branchCode}</td>
                <td style={{ padding: '16px' }}>
                  <div style={{ fontWeight: 500 }}>{branch.branchName}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{branch.email}</div>
                </td>
                <td style={{ padding: '16px', fontSize: '14px', color: '#666' }}>
                  {branch.city}, {branch.state}
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    backgroundColor: branch.isActive ? '#e8f5e9' : '#ffebee',
                    color: branch.isActive ? '#2e7d32' : '#c62828',
                  }}>
                    {branch.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>
                  <button style={{ padding: '6px 12px', marginRight: '8px', backgroundColor: '#f5f5f5', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Edit
                  </button>
                  <button style={{ padding: '6px 12px', backgroundColor: '#ffebee', color: '#c62828', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredBranches.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            No branches found
          </div>
        )}
      </div>

      {/* Create Restaurant Modal */}
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
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, color: '#1a1a2e' }}>Add New Restaurant</h3>
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

            <form onSubmit={handleCreateRestaurant}>
              <div style={{ display: 'grid', gap: '16px' }}>
                {/* Basic Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                      Restaurant Name *
                    </label>
                    <input
                      type="text"
                      value={newRestaurant.name}
                      onChange={(e) => updateNewRestaurant('name', e.target.value)}
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
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                      Email *
                    </label>
                    <input
                      type="email"
                      value={newRestaurant.email}
                      onChange={(e) => updateNewRestaurant('email', e.target.value)}
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

                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                    Phone *
                  </label>
                  <input
                    type="tel"
                    value={newRestaurant.phone}
                    onChange={(e) => updateNewRestaurant('phone', e.target.value)}
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

                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                    Description * (minimum 10 characters)
                  </label>
                  <textarea
                    value={newRestaurant.description}
                    onChange={(e) => updateNewRestaurant('description', e.target.value)}
                    rows={3}
                    placeholder="Describe your restaurant (e.g., 'Authentic Italian cuisine with fresh ingredients and traditional recipes')"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px',
                      resize: 'vertical',
                    }}
                  />
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    {newRestaurant.description?.length || 0}/10 characters (minimum required)
                  </div>
                  {newRestaurant.description && newRestaurant.description.trim().length < 10 && (
                    <div style={{ color: '#f44336', fontSize: '12px', marginTop: '4px' }}>
                      Description must be at least 10 characters long
                    </div>
                  )}
                </div>

                {/* Address */}
                <div>
                  <h4 style={{ margin: '16px 0 12px 0', color: '#1a1a2e' }}>Address</h4>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <input
                      type="text"
                      placeholder="Street Address"
                      value={newRestaurant.address.street}
                      onChange={(e) => updateNewRestaurant('address.street', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <input
                        type="text"
                        placeholder="City"
                        value={newRestaurant.address.city}
                        onChange={(e) => updateNewRestaurant('address.city', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                      <input
                        type="text"
                        placeholder="State"
                        value={newRestaurant.address.state}
                        onChange={(e) => updateNewRestaurant('address.state', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="ZIP Code"
                      value={newRestaurant.address.zipCode}
                      onChange={(e) => updateNewRestaurant('address.zipCode', e.target.value)}
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

                {/* Cuisine & Price */}
                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                    Cuisine Types *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                    {[
                      'Italian', 'Chinese', 'Indian', 'Mexican', 'American',
                      'Japanese', 'Thai', 'French', 'Mediterranean'
                    ].map(cuisine => (
                      <label key={cuisine} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        backgroundColor: newRestaurant.cuisine.includes(cuisine) ? '#e3f2fd' : '#fff',
                        fontSize: '14px',
                      }}>
                        <input
                          type="checkbox"
                          checked={newRestaurant.cuisine.includes(cuisine)}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            if (isChecked) {
                              updateNewRestaurant('cuisine', [...newRestaurant.cuisine, cuisine]);
                            } else {
                              updateNewRestaurant('cuisine', newRestaurant.cuisine.filter(c => c !== cuisine));
                            }
                          }}
                          style={{ width: '16px', height: '16px' }}
                        />
                        <span>{cuisine}</span>
                      </label>
                    ))}
                  </div>
                  {newRestaurant.cuisine.length === 0 && (
                    <div style={{ color: '#f44336', fontSize: '12px', marginTop: '4px' }}>
                      Please select at least one cuisine type
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                      Price Range
                    </label>
                    <select
                      value={newRestaurant.priceRange}
                      onChange={(e) => updateNewRestaurant('priceRange', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    >
                      <option value="$">$ - Budget</option>
                      <option value="$$">$$ - Moderate</option>
                      <option value="$$$">$$$ - Expensive</option>
                      <option value="$$$$">$$$$ - Very Expensive</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                      Delivery Time (min)
                    </label>
                    <input
                      type="number"
                      value={newRestaurant.deliveryTime || 30}
                      onChange={(e) => updateNewRestaurant('deliveryTime', parseInt(e.target.value) || 30)}
                      min="10"
                      max="120"
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

                {/* Submit Buttons */}
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
                    {createLoading ? 'Creating...' : 'Create Restaurant'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
