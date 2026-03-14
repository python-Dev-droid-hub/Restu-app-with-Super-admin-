import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: {
    _id: string;
    name: string;
  };
  images?: string[];
  isAvailable: boolean;
  preparationTime: number;
  createdAt: string;
}

interface Category {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
}

interface ProductsResponse {
  products: Product[];
  total?: number;
}

interface CategoriesResponse {
  categories: Category[];
}

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    preparationTime: '',
    isAvailable: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [productsResponse, categoriesResponse] = await Promise.all([
        api.getAllProducts(),
        api.getAllCategories(),
      ]);

      console.log('Products response:', productsResponse);
      console.log('Categories response:', categoriesResponse);

      if (productsResponse.success && productsResponse.data) {
        const productsData = productsResponse.data as ProductsResponse;
        setProducts(productsData.products || []);
      } else {
        setError(productsResponse.error || 'Failed to load products');
      }

      if (categoriesResponse.success && categoriesResponse.data) {
        const categoriesData = categoriesResponse.data as CategoriesResponse;
        setCategories(categoriesData.categories || []);
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to connect to server. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {};

    if (!formData.name.trim()) {
      errors.name = 'Product name is required';
    } else if (formData.name.length < 2) {
      errors.name = 'Product name must be at least 2 characters';
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      errors.price = 'Valid price is required';
    } else if (parseFloat(formData.price) > 50000) {
      errors.price = 'Price cannot exceed PKR 50,000';
    }

    if (!formData.category) {
      errors.category = 'Please select a category';
    }

    if (!formData.preparationTime || parseInt(formData.preparationTime) <= 0) {
      errors.preparationTime = 'Valid preparation time is required';
    } else if (parseInt(formData.preparationTime) > 120) {
      errors.preparationTime = 'Preparation time cannot exceed 120 minutes';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      preparationTime: '',
      isAvailable: true,
    });
    setImagePreview(null);
    setFormErrors({});
    setEditingProduct(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setFormErrors(prev => ({ ...prev, image: 'Image size must be less than 5MB' }));
        return;
      }
      if (!file.type.startsWith('image/')) {
        setFormErrors(prev => ({ ...prev, image: 'Please select a valid image file' }));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setFormErrors(prev => ({ ...prev, image: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setFormErrors({});

    try {
      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        category: formData.category,
        preparationTime: parseInt(formData.preparationTime),
        isAvailable: formData.isAvailable,
        // Note: Image upload would need backend support for file handling
        // For now, we'll handle products without images
      };

      if (editingProduct) {
        await api.updateProduct(editingProduct._id, productData);
      } else {
        await api.createProduct(productData);
      }

      await loadData();
      setShowAddModal(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving product:', error);
      setFormErrors({ submit: error.message || 'Failed to save product. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      category: product.category._id,
      preparationTime: product.preparationTime.toString(),
      isAvailable: product.isAvailable,
    });
    setShowAddModal(true);
  };

  const handleDelete = async (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await api.deleteProduct(productId);
        await loadData();
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Manage your restaurant menu</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + Add Product
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
                    <strong>🔒 Authentication Required:</strong> Please log in to access products
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
                  onClick={loadData} 
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
                🍽️
              </div>
            </div>
            <div className="stat-card-content">
              <p className="stat-card-label">Total Products</p>
              <h3 className="stat-card-value">{products.length}</h3>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-icon" style={{background: '#E8F5E9'}}>
                ✅
              </div>
            </div>
            <div className="stat-card-content">
              <p className="stat-card-label">Available</p>
              <h3 className="stat-card-value">{products.filter(p => p.isAvailable).length}</h3>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-icon" style={{background: '#E3F2FD'}}>
                📁
              </div>
            </div>
            <div className="stat-card-content">
              <p className="stat-card-label">Categories</p>
              <h3 className="stat-card-value">{categories.length}</h3>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-icon" style={{background: '#FFF3E0'}}>
                ⏱️
              </div>
            </div>
            <div className="stat-card-content">
              <p className="stat-card-label">Avg Prep Time</p>
              <h3 className="stat-card-value">
                {products.length > 0 
                  ? Math.round(products.reduce((sum, p) => sum + p.preparationTime, 0) / products.length)
                  : 0} min
              </h3>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="filters-bar">
          <div className="filter-item" style={{ flex: 1 }}>
            <label className="filter-label">Search Products</label>
            <input
              type="text"
              className="form-input"
              placeholder="Search by name..."
              style={{ width: '100%' }}
            />
          </div>
          <div className="filter-item">
            <label className="filter-label">Category</label>
            <select className="form-select" style={{ minWidth: '150px' }}>
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Products Card */}
        <div className="content-card">
          <div className="content-card-header">
            <h2 className="content-card-title">All Products</h2>
            <div className="content-card-actions">
              <span className="text-secondary">{products.length} products</span>
            </div>
          </div>
          <div className="content-card-body">
            {products.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🍽️</div>
                <h3 className="empty-state-title">No products found</h3>
                <p className="empty-state-message">Get started by adding your first product</p>
                <button className="btn btn-primary empty-state-action" onClick={() => setShowAddModal(true)}>
                  Add Product
                </button>
              </div>
            ) : (
              <div className="products-grid">
                {products.map((product) => (
                  <div key={product._id} className="product-card">
                    <div className="product-image">
                      {product.images?.[0] ? (
                        <img src={api.getImageUrl(product.images[0])} alt={product.name} />
                      ) : (
                        <div className="no-image">🍕</div>
                      )}
                    </div>
                    <div className="product-info">
                      <h3 className="product-name">{product.name}</h3>
                      <p className="product-description">{product.description}</p>
                      <div className="product-details">
                        <span className="product-price">PKR {product.price}</span>
                        <span className="product-category">{product.category.name}</span>
                        <span className="product-time">{product.preparationTime} min</span>
                      </div>
                      <div className="product-status">
                        <span className={`status ${product.isAvailable ? 'available' : 'unavailable'}`}>
                          {product.isAvailable ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                    </div>
                    <div className="product-actions">
                      <button className="btn btn-outline btn-sm" onClick={() => handleEdit(product)}>
                        Edit
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => handleDelete(product._id)}>
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
              <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button 
                className="modal-close" 
                onClick={() => { setShowAddModal(false); resetForm(); }}
                type="button"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              {formErrors.submit && (
                <div className="alert alert-error" style={{ marginBottom: '20px' }}>
                  {formErrors.submit}
                </div>
              )}

              <div className="form-grid">
                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Product Image */}
                  <div className="form-group">
                    <label className="form-label">Product Image</label>
                    <div className="image-upload-area" style={{
                      border: '2px dashed var(--border-color)',
                      borderRadius: '8px',
                      padding: '20px',
                      textAlign: 'center',
                      background: 'var(--bg-hover)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}>
                      {imagePreview ? (
                        <div>
                          <img 
                            src={imagePreview} 
                            alt="Product preview" 
                            style={{ 
                              maxWidth: '100%', 
                              maxHeight: '200px', 
                              borderRadius: '8px',
                              marginBottom: '10px'
                            }} 
                          />
                          <button 
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => { setImagePreview(null); }}
                          >
                            Remove Image
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: '48px', marginBottom: '10px', color: 'var(--text-hint)' }}>
                            📷
                          </div>
                          <p style={{ margin: '0 0 10px 0', color: 'var(--text-secondary)' }}>
                            Click to upload product image
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            style={{ display: 'none' }}
                            id="product-image"
                          />
                          <label htmlFor="product-image" className="btn btn-outline btn-sm">
                            Choose Image
                          </label>
                        </div>
                      )}
                    </div>
                    {formErrors.image && (
                      <div className="error-message">{formErrors.image}</div>
                    )}
                    <small style={{ color: 'var(--text-hint)', fontSize: '12px' }}>
                      Max size: 5MB. Supported formats: JPG, PNG, GIF
                    </small>
                  </div>
                </div>

                {/* Right Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Product Name */}
                  <div className="form-group">
                    <label className="form-label">
                      Product Name <span style={{ color: 'var(--status-cancelled)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-input ${formErrors.name ? 'input-error' : ''}`}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Chicken Tikka Pizza"
                      maxLength={100}
                    />
                    {formErrors.name && <div className="error-message">{formErrors.name}</div>}
                  </div>

                  {/* Price and Prep Time */}
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">
                        Price (PKR) <span style={{ color: 'var(--status-cancelled)' }}>*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="50000"
                        className={`form-input ${formErrors.price ? 'input-error' : ''}`}
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0.00"
                      />
                      {formErrors.price && <div className="error-message">{formErrors.price}</div>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Prep Time (min) <span style={{ color: 'var(--status-cancelled)' }}>*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        className={`form-input ${formErrors.preparationTime ? 'input-error' : ''}`}
                        value={formData.preparationTime}
                        onChange={(e) => setFormData({ ...formData, preparationTime: e.target.value })}
                        placeholder="15"
                      />
                      {formErrors.preparationTime && <div className="error-message">{formErrors.preparationTime}</div>}
                    </div>
                  </div>

                  {/* Category */}
                  <div className="form-group">
                    <label className="form-label">
                      Category <span style={{ color: 'var(--status-cancelled)' }}>*</span>
                    </label>
                    <select
                      className={`form-select ${formErrors.category ? 'input-error' : ''}`}
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="">Select a category</option>
                      {categories.filter(cat => cat.isActive).map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {formErrors.category && <div className="error-message">{formErrors.category}</div>}
                  </div>

                  {/* Description */}
                  <div className="form-group">
                    <label className="form-label">
                      Description <span style={{ color: 'var(--status-cancelled)' }}>*</span>
                    </label>
                    <textarea
                      className={`form-textarea ${formErrors.description ? 'input-error' : ''}`}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe your product in detail..."
                      rows={4}
                      maxLength={500}
                    />
                    {formErrors.description && <div className="error-message">{formErrors.description}</div>}
                    <small style={{ color: 'var(--text-hint)', fontSize: '12px' }}>
                      {formData.description.length}/500 characters
                    </small>
                  </div>

                  {/* Availability */}
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.isAvailable}
                        onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                      />
                      Available for order
                    </label>
                    <small style={{ color: 'var(--text-hint)', fontSize: '12px', marginLeft: '24px' }}>
                      Uncheck if this product is temporarily unavailable
                    </small>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Saving...' : (editingProduct ? '✏️ Update Product' : '➕ Add Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
