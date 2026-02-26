import { useEffect, useState } from 'react';
import { api } from '../../api/client';

interface Category {
  _id: string;
  name: string;
  description?: string;
}

interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category?: Category;
  isActive: boolean;
  ingredients: string[];
  image?: string;
}

interface ProductsResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface CategoriesResponse {
  categories: Category[];
}

export function MenuManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [createCategoryLoading, setCreateCategoryLoading] = useState(false);

  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: 0,
    category: '',
    preparationTime: 15,
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    isSpicy: false,
    ingredients: [] as string[],
  });

  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);

      const response = await api.get<ProductsResponse>(`/menu/admin/products?${params.toString()}`);

      if (response.success && response.data) {
        setProducts(response.data.products || []);
      } else {
        setError(response.message || 'Failed to fetch products');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get<CategoriesResponse>('/menu/admin/categories');
      if (response.success && response.data) {
        setCategories(response.data.categories || []);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price || !newProduct.category) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setCreateLoading(true);

      const productData = {
        ...newProduct,
        isAvailable: true,
      };

      const response = await api.post('/menu/admin/products', productData);

      if (response.success) {
        setShowCreateModal(false);
        setNewProduct({
          name: '',
          description: '',
          price: 0,
          category: '',
          preparationTime: 15,
          isVegetarian: false,
          isVegan: false,
          isGlutenFree: false,
          isSpicy: false,
          ingredients: [],
        });
        fetchProducts();
        alert('Product created successfully!');
      } else {
        alert(response.message || 'Failed to create product');
      }
    } catch (err) {
      console.error('Error creating product:', err);
      alert('Failed to create product. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name.trim()) {
      alert('Please enter a category name');
      return;
    }

    try {
      setCreateCategoryLoading(true);

      const response = await api.post('/menu/admin/categories', newCategory);

      if (response.success) {
        setShowCreateCategoryModal(false);
        setNewCategory({
          name: '',
          description: '',
        });
        fetchCategories();
        alert('Category created successfully!');
      } else {
        alert(response.message || 'Failed to create category');
      }
    } catch (err) {
      console.error('Error creating category:', err);
      alert('Failed to create category. Please try again.');
    } finally {
      setCreateCategoryLoading(false);
    }
  };

  const updateNewProduct = (field: string, value: any) => {
    if (field === 'ingredients') {
      const ingredientsArray = value.split(',').map((i: string) => i.trim()).filter((i: string) => i);
      setNewProduct(prev => ({
        ...prev,
        ingredients: ingredientsArray,
      }));
    } else {
      setNewProduct(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const filteredProducts = products?.filter(product => {
    const searchLower = searchTerm?.toLowerCase() || '';
    const matchesSearch = product.name?.toLowerCase().includes(searchLower) ||
                         product.description?.toLowerCase().includes(searchLower);
    const matchesCategory = categoryFilter === 'all' || product.category?._id === categoryFilter;
    return matchesSearch && matchesCategory;
  }) || [];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
        <div>Loading menu items...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#dc3545' }}>
        <div>Error: {error}</div>
        <button onClick={fetchProducts} style={{ marginTop: '16px', padding: '8px 16px' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, color: '#1a1a2e' }}>Menu Management ({products?.length || 0})</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowCreateCategoryModal(true)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#4caf50',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            + Add Category
          </button>
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
            + Add Product
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, padding: '10px 16px', border: '1px solid #ddd', borderRadius: '6px' }}
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ padding: '10px 16px', border: '1px solid #ddd', borderRadius: '6px', minWidth: '150px' }}
        >
          <option value="all">All Categories</option>
          {categories?.map(cat => (
            <option key={cat._id} value={cat._id}>{cat.name}</option>
          )) || []}
        </select>
        <button onClick={fetchProducts} style={{ padding: '10px 20px', backgroundColor: '#1976d2', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          Refresh
        </button>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#666' }}>Product</th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#666' }}>Category</th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#666' }}>Price</th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#666' }}>Status</th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: 600, color: '#666' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product._id} style={{ borderTop: '1px solid #eee' }}>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {product.image && (
                      <img src={product.image} alt={product.name} style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} />
                    )}
                    <div>
                      <div style={{ fontWeight: 500 }}>{product.name || 'Unnamed Product'}</div>
                      <div style={{ fontSize: '12px', color: '#666', maxWidth: '200px' }}>
                        {product.description?.substring(0, 50) || 'No description'}...
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '16px', fontSize: '14px', color: '#666' }}>
                  {product.category?.name || 'Uncategorized'}
                </td>
                <td style={{ padding: '16px', fontSize: '14px', fontWeight: 500 }}>
                  ${product.price?.toFixed(2) || '0.00'}
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    backgroundColor: product.isActive ? '#e8f5e9' : '#ffebee',
                    color: product.isActive ? '#2e7d32' : '#c62828',
                  }}>
                    {product.isActive ? 'Active' : 'Inactive'}
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
        {filteredProducts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            No products found. Add a product to get started.
          </div>
        )}
      </div>

      {/* Create Product Modal */}
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
              <h3 style={{ margin: 0, color: '#1a1a2e' }}>Add New Product</h3>
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

            <form onSubmit={handleCreateProduct}>
              <div style={{ display: 'grid', gap: '16px' }}>
                {/* Basic Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                      Product Name *
                    </label>
                    <input
                      type="text"
                      value={newProduct.name}
                      onChange={(e) => updateNewProduct('name', e.target.value)}
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
                      Category *
                    </label>
                    <select
                      value={newProduct.category}
                      onChange={(e) => updateNewProduct('category', e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    >
                      <option value="">Select Category</option>
                      {categories?.map(cat => (
                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                      )) || []}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                      Price ($) *
                    </label>
                    <input
                      type="number"
                      value={newProduct.price}
                      onChange={(e) => updateNewProduct('price', parseFloat(e.target.value))}
                      min="0"
                      step="0.01"
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
                      Prep Time (min)
                    </label>
                    <input
                      type="number"
                      value={newProduct.preparationTime}
                      onChange={(e) => updateNewProduct('preparationTime', parseInt(e.target.value))}
                      min="1"
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

                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                    Description
                  </label>
                  <textarea
                    value={newProduct.description}
                    onChange={(e) => updateNewProduct('description', e.target.value)}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                    Ingredients (comma separated)
                  </label>
                  <input
                    type="text"
                    value={newProduct.ingredients.join(', ')}
                    onChange={(e) => updateNewProduct('ingredients', e.target.value)}
                    placeholder="e.g. tomato, cheese, basil"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  />
                </div>

                {/* Dietary Options */}
                <div>
                  <h4 style={{ margin: '16px 0 12px 0', color: '#1a1a2e' }}>Dietary Information</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                    {[
                      { key: 'isVegetarian', label: 'Vegetarian' },
                      { key: 'isVegan', label: 'Vegan' },
                      { key: 'isGlutenFree', label: 'Gluten Free' },
                      { key: 'isSpicy', label: 'Spicy' },
                    ].map(option => (
                      <label key={option.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={(newProduct as any)[option.key]}
                          onChange={(e) => updateNewProduct(option.key, e.target.checked)}
                          style={{ width: '16px', height: '16px' }}
                        />
                        <span style={{ fontSize: '14px', color: '#666' }}>{option.label}</span>
                      </label>
                    ))}
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
                    {createLoading ? 'Creating...' : 'Create Product'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Category Modal */}
      {showCreateCategoryModal && (
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
              <h3 style={{ margin: 0, color: '#1a1a2e' }}>Add New Category</h3>
              <button
                onClick={() => setShowCreateCategoryModal(false)}
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

            <form onSubmit={handleCreateCategory}>
              <div style={{ display: 'grid', gap: '16px' }}>
                {/* Category Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder="e.g., Appetizers, Main Courses, Desserts"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  />
                </div>

                {/* Category Description */}
                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                    Description (Optional)
                  </label>
                  <textarea
                    value={newCategory.description}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    placeholder="Brief description of this category"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px',
                      resize: 'vertical',
                    }}
                  />
                </div>

                {/* Submit Buttons */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateCategoryModal(false)}
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
                    disabled={createCategoryLoading}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: createCategoryLoading ? '#ccc' : '#4caf50',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: createCategoryLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                  >
                    {createCategoryLoading ? 'Creating...' : 'Create Category'}
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
