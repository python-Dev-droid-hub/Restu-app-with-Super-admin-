import { api } from '../components/api/client';

/**
 * DEBUG VERSION - with extensive logging
 * Populate order items with full product details
 * Used by Waiter, Chef, Cashier dashboards for consistent data
 */
export const populateOrdersWithProductDetails = async (orders: any[]): Promise<any[]> => {
  console.log('=== POPULATE ORDERS START ===');
  console.log('Input orders count:', orders.length);
  
  // Convert Mongoose documents to plain objects
  const plainOrders = orders.map(order => {
    // Handle Mongoose document with _doc or toObject
    if (order._doc) {
      // Preserve populated fields that are not in _doc
      const populatedFields: any = {};
      
      // Check for populated table data
      if (order.table && typeof order.table === 'object' && order.table._id) {
        populatedFields.table = order.table;
      }
      // Check for populated customer data
      if (order.customer && typeof order.customer === 'object' && order.customer._id) {
        populatedFields.customer = order.customer;
      }
      // Check for populated waiter data
      if (order.waiter && typeof order.waiter === 'object' && order.waiter._id) {
        populatedFields.waiter = order.waiter;
      }
      // Check for populated branch data
      if (order.branch && typeof order.branch === 'object' && order.branch._id) {
        populatedFields.branch = order.branch;
      }
      
      return { ...order._doc, ...populatedFields, id: order.id || order._id };
    }
    if (order.toObject) {
      return order.toObject();
    }
    return order;
  });
  
  if (plainOrders.length > 0) {
    console.log('First order input:', JSON.stringify(plainOrders[0], null, 2));
  }
  
  try {
    const populatedOrders = await Promise.all(
      plainOrders.map(async (order, orderIndex) => {
        console.log(`\n--- Processing order ${orderIndex + 1}/${orders.length} ---`);
        console.log('Order ID:', order.id || order._id);
        console.log('Items count:', order.items?.length || 0);
        
        const populatedItems = await Promise.all(
          (order.items || []).map(async (rawItem: any, itemIndex: number) => {
            // Convert Mongoose subdocument to plain object
            const item = rawItem._doc ? { ...rawItem._doc, id: rawItem.id || rawItem._id } : 
                          rawItem.toObject ? rawItem.toObject() : rawItem;
            
            console.log(`\n  Item ${itemIndex + 1}:`);
            console.log('  Raw item:', JSON.stringify(item, null, 2));
            
            // Check all possible product name fields
            const productId = item.product?._id || item.product || item.productId || item.menuItemId;
            const currentName = item.product?.name || item.productName || item.name || 'Unknown';
            
            console.log('  Product ID:', productId);
            console.log('  Current name:', currentName);
            console.log('  Has product name?', !!(item.product?.name || item.productName));
            
            // Check if product data is already complete
            const hasProductName = item.productName || 
                                  (item.product && typeof item.product === 'object' && item.product.name);
            
            if (hasProductName) {
              console.log('  ✓ Item already has product name, no fetch needed');
              // Already has product name, return as-is with normalized structure
              return {
                ...item,
                productName: item.productName || item.product?.name,
                quantity: Number(item.quantity) || 1,
                product: {
                  ...item.product,
                  name: item.productName || item.product?.name,
                  image: item.product?.imageUrl || item.product?.image || item.image,
                }
              };
            }

            // If product data is incomplete, try to fetch it
            if (!item.product?.name && productId) {
              try {
                console.log(`  → Fetching product data for ID: ${productId}`);
                
                const productRes = await api.get(`/menu/items/${productId}`);
                
                console.log(`  → Product fetched:`, JSON.stringify(productRes.data, null, 2));
                
                if (productRes.success && productRes.data) {
                  const productData = productRes.data;
                  
                  const populated = {
                    ...item,
                    productName: productData.name || productData.item_name || 'Unknown Product',
                    quantity: Number(item.quantity) || 1,
                    product: {
                      _id: productId,
                      name: productData.name || productData.item_name || 'Unknown Product',
                      image: productData.imageUrl || productData.image || item.image || null,
                      description: productData.description || '',
                      price: productData.price || item.unitPrice || item.price || 0
                    }
                  };
                  
                  console.log('  → Populated item:', JSON.stringify(populated, null, 2));
                  return populated;
                }
              } catch (error: any) {
                console.error(`  ✗ Failed to fetch product ${productId}:`, error.message);
              }
            }

            // Return item with fallback if fetch failed or no product ID
            const fallbackItem = {
              ...item,
              productName: item.productName || item.name || 'Unknown Product',
              quantity: Number(item.quantity) || 1,
              product: {
                ...(typeof item.product === 'object' ? item.product : {}),
                name: item.productName || item.name || 'Unknown Product',
                image: item.image || null,
              }
            };
            console.log('  → Fallback item:', JSON.stringify(fallbackItem, null, 2));
            return fallbackItem;
          })
        );

        return {
          ...order,
          items: populatedItems
        };
      })
    );

    console.log('\n=== POPULATE ORDERS END ===');
    if (populatedOrders.length > 0) {
      console.log('Output first order:', JSON.stringify(populatedOrders[0], null, 2));
    }
    return populatedOrders;
    
  } catch (error) {
    console.error('=== ERROR POPULATING ORDERS ===', error);
    return orders; // Return original if population fails
  }
};

/**
 * Get Waiter Dashboard Orders with populated products
 */
export const getWaiterOrders = async (branchId?: string): Promise<{ success: boolean; orders: any[] }> => {
  console.log('\n>>> GET WAITER ORDERS <<<');
  console.log('Branch ID:', branchId);
  
  try {
    const queryParams = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
    const response = await api.get(`/orders/waiter${queryParams}`);
    
    console.log('API Response status:', response.success);
    console.log('API Response data keys:', Object.keys(response.data || {}));
    
    const orders = response.data?.orders || [];
    console.log('Orders count from API:', orders.length);
    
    if (orders.length > 0) {
      console.log('First order from API:', JSON.stringify(orders[0], null, 2));
    }
    
    const populated = await populateOrdersWithProductDetails(orders);
    
    console.log('Orders after population count:', populated.length);
    
    return { success: true, orders: populated };
    
  } catch (error: any) {
    console.error('Failed to get waiter orders:', error.message);
    console.error('Error response:', error.response?.data);
    return { success: false, orders: [] };
  }
};

/**
 * Get Cashier/Admin Orders with populated products
 */
export const getCashierOrders = async (filters?: Record<string, any>): Promise<{ success: boolean; orders: any[] }> => {
  console.log('\n>>> GET CASHIER ORDERS <<<');
  console.log('Filters:', filters);
  
  try {
    const params: Record<string, string> = {
      page: '1',
      limit: '200',
      ...(filters
        ? Object.fromEntries(
            Object.entries(filters)
              .filter(([, value]) => value !== undefined)
              .map(([key, value]) => [key, String(value)])
          )
        : {}),
    };
    const queryParams = `?${new URLSearchParams(params).toString()}`;

    const response = await api.get(`/orders${queryParams}`);

    console.log('API Response status:', response.success);
    console.log('API Response data keys:', Object.keys(response.data || {}));

    const data = response.data as { orders?: unknown[]; data?: { orders?: unknown[] } } | undefined;
    const orders = data?.orders || data?.data?.orders || [];
    console.log('Orders count from API:', orders.length);
    
    if (orders.length > 0) {
      console.log('First order from API:', JSON.stringify(orders[0], null, 2));
    }
    
    const populated = await populateOrdersWithProductDetails(orders);
    
    console.log('Orders after population count:', populated.length);
    
    return { success: true, orders: populated };
    
  } catch (error: any) {
    console.error('Failed to get cashier orders:', error.message);
    console.error('Error response:', error.response?.data);
    return { success: false, orders: [] };
  }
};

/**
 * Get Chef Orders (already has good data, but use for consistency)
 */
export const getChefOrders = async (branchId?: string): Promise<{ success: boolean; orders: any[] }> => {
  console.log('\n>>> GET CHEF ORDERS <<<');
  console.log('Branch ID:', branchId);
  
  try {
    const queryParams = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
    const response = await api.get(`/orders/branch${queryParams}`);
    
    console.log('API Response:', JSON.stringify(response.data, null, 2));
    
    const orders = response.data?.orders || [];
    // Chef data usually has good product details, but populate just in case
    const populated = await populateOrdersWithProductDetails(orders);
    
    return { success: true, orders: populated };
    
  } catch (error: any) {
    console.error('Failed to get chef orders:', error.message);
    return { success: false, orders: [] };
  }
};

/**
 * Get Manager Dashboard Orders with populated products
 */
export const getManagerOrders = async (limit: number = 5): Promise<{ success: boolean; orders: any[] }> => {
  console.log('\n>>> GET MANAGER ORDERS <<<');
  console.log('Limit:', limit);
  
  try {
    const queryParams = `?limit=${encodeURIComponent(limit)}`;
    const response = await api.get(`/orders${queryParams}`);
    
    console.log('API Response:', JSON.stringify(response.data, null, 2));
    
    const orders = response.data?.orders || [];
    const populated = await populateOrdersWithProductDetails(orders);
    
    return { success: true, orders: populated };
    
  } catch (error: any) {
    console.error('Failed to get manager orders:', error.message);
    return { success: false, orders: [] };
  }
};
