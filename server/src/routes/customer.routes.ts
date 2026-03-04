import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { Branch } from '../models/Branch';
import { Deal } from '../models/Deal';
import { Order } from '../models/Order';
import { Favorite } from '../models/Favorite';
import { sendSuccess, sendError, asyncHandler } from '../utils/response';

const router = Router();

// ========== HOME SCREEN DATA ==========
// GET /api/customer/home - Get all home screen data
router.get('/home', asyncHandler(async (req, res) => {
  // Get active banners (deals with images)
  const banners = await Deal.find({ 
    isActive: true, 
    showOnHome: true,
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() }
  })
    .select('name description image discountPercentage')
    .limit(5)
    .lean();

  // Get categories
  const categories = await Category.find({ isActive: true })
    .select('name icon image')
    .limit(10)
    .lean();

  // Get popular products (sorted by order count or rating)
  const popularProducts = await Product.find({ 
    isActive: true,
    isAvailable: true 
  })
    .select('name description price originalPrice image rating reviews category')
    .populate('category', 'name')
    .sort({ rating: -1, reviews: -1 })
    .limit(10)
    .lean();

  // Get nearby branches (simplified - return all active branches)
  const branches = await Branch.find({ isActive: true })
    .select('branchName addressLine city lat lng phone')
    .limit(5)
    .lean();

  sendSuccess(res, {
    banners: banners.map(b => ({
      id: b._id,
      title: b.name,
      subtitle: b.description,
      image: b.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop',
      discount: b.discountPercentage
    })),
    categories: categories.map(c => ({
      id: c._id,
      name: c.name,
      icon: c.icon || '🍽️',
      image: c.image
    })),
    popularProducts: popularProducts.map(p => ({
      id: p._id,
      name: p.name,
      description: p.description,
      price: p.price,
      originalPrice: p.originalPrice || p.price,
      image: p.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=200&fit=crop',
      rating: p.rating || 4.5,
      reviews: p.reviews || 0,
      category: p.category?.name || 'Food'
    })),
    branches
  }, 'Home data retrieved successfully');
}));

// ========== PRODUCTS ==========
// GET /api/customer/products - Get all products with filters
router.get('/products', asyncHandler(async (req, res) => {
  const { 
    category, 
    search, 
    sortBy = 'recommended',
    minPrice, 
    maxPrice,
    page = 1,
    limit = 20
  } = req.query;

  let query: any = { isActive: true, isAvailable: true };

  if (category && category !== 'all') {
    query.category = category;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  let sortOption: any = {};
  switch (sortBy) {
    case 'price_low': sortOption = { price: 1 }; break;
    case 'price_high': sortOption = { price: -1 }; break;
    case 'rating': sortOption = { rating: -1 }; break;
    case 'newest': sortOption = { createdAt: -1 }; break;
    default: sortOption = { rating: -1, reviews: -1 }; // recommended
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [products, total] = await Promise.all([
    Product.find(query)
      .select('name description price originalPrice image rating reviews category sizes')
      .populate('category', 'name')
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Product.countDocuments(query)
  ]);

  sendSuccess(res, {
    products: products.map(p => ({
      id: p._id,
      name: p.name,
      description: p.description,
      price: p.price,
      originalPrice: p.originalPrice,
      image: p.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=200&fit=crop',
      rating: p.rating || 4.5,
      reviews: p.reviews || 0,
      category: p.category?.name || 'Food',
      sizes: p.sizes || []
    })),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit))
    }
  }, 'Products retrieved successfully');
}));

// GET /api/customer/products/:id - Get single product details
router.get('/products/:id', asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('category', 'name')
    .populate('sizes.size', 'name')
    .lean();

  if (!product) {
    return sendError(res, 'Product not found', 404);
  }

  // Get related products
  const relatedProducts = await Product.find({
    category: product.category,
    _id: { $ne: product._id },
    isActive: true
  })
    .select('name price image rating')
    .limit(4)
    .lean();

  sendSuccess(res, {
    product: {
      id: product._id,
      name: product.name,
      description: product.description,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      rating: product.rating || 4.5,
      reviews: product.reviews || 0,
      category: product.category?.name,
      sizes: product.sizes || [],
      customizations: product.customizations || []
    },
    relatedProducts: relatedProducts.map(p => ({
      id: p._id,
      name: p.name,
      price: p.price,
      image: p.image,
      rating: p.rating
    }))
  }, 'Product details retrieved successfully');
}));

// ========== CATEGORIES ==========
// GET /api/customer/categories - Get all categories
router.get('/categories', asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true })
    .select('name icon image description')
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  sendSuccess(res, {
    categories: categories.map(c => ({
      id: c._id,
      name: c.name,
      icon: c.icon || '🍽️',
      image: c.image,
      description: c.description
    }))
  }, 'Categories retrieved successfully');
}));

// ========== DEALS/OFFERS ==========
// GET /api/customer/deals - Get active deals
router.get('/deals', asyncHandler(async (req, res) => {
  const deals = await Deal.find({
    isActive: true,
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() }
  })
    .select('name description image discountPercentage minOrderAmount')
    .sort({ discountPercentage: -1 })
    .lean();

  sendSuccess(res, {
    deals: deals.map(d => ({
      id: d._id,
      title: d.name,
      description: d.description,
      image: d.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop',
      discount: d.discountPercentage,
      minOrder: d.minOrderAmount
    }))
  }, 'Deals retrieved successfully');
}));

// ========== BRANCHES ==========
// GET /api/customer/branches - Get all active branches
router.get('/branches', asyncHandler(async (req, res) => {
  const { lat, lng, maxDistance = 50 } = req.query; // maxDistance in km

  let query: any = { isActive: true };

  // If location provided, find nearby branches
  if (lat && lng) {
    const latitude = Number(lat);
    const longitude = Number(lng);
    const distanceInMeters = Number(maxDistance) * 1000;

    query.location = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: distanceInMeters
      }
    };
  }

  const branches = await Branch.find(query)
    .select('branchName branchCode addressLine city state lat lng phone operatingHours')
    .limit(20)
    .lean();

  sendSuccess(res, {
    branches: branches.map(b => ({
      id: b._id,
      name: b.branchName,
      code: b.branchCode,
      address: b.addressLine,
      city: b.city,
      state: b.state,
      location: { lat: b.lat, lng: b.lng },
      phone: b.phone,
      hours: b.operatingHours
    }))
  }, 'Branches retrieved successfully');
}));

// ========== FAVORITES (Protected) ==========
// GET /api/customer/favorites - Get user's favorites
router.get('/favorites', authenticate, authorize('CUSTOMER'), asyncHandler(async (req, res) => {
  const userId = (req as any).user._id;

  const favorites = await Favorite.find({ user: userId })
    .populate('product', 'name price originalPrice image rating reviews')
    .populate('restaurant', 'name address')
    .sort({ createdAt: -1 })
    .lean();

  sendSuccess(res, {
    favorites: favorites.map(f => ({
      id: f._id,
      product: f.product ? {
        id: f.product._id,
        name: (f.product as any).name,
        price: (f.product as any).price,
        originalPrice: (f.product as any).originalPrice,
        image: (f.product as any).image,
        rating: (f.product as any).rating || 4.5,
        restaurant: (f.product as any).restaurant?.name || 'Restaurant'
      } : null
    })).filter(f => f.product !== null)
  }, 'Favorites retrieved successfully');
}));

// POST /api/customer/favorites - Add to favorites
router.post('/favorites', authenticate, authorize('CUSTOMER'), asyncHandler(async (req, res) => {
  const userId = (req as any).user._id;
  const { productId } = req.body;

  // Check if already exists
  const existing = await Favorite.findOne({ user: userId, product: productId });
  if (existing) {
    return sendError(res, 'Product already in favorites', 400);
  }

  const favorite = new Favorite({
    user: userId,
    product: productId,
    type: 'product'
  });

  await favorite.save();
  sendSuccess(res, { id: favorite._id }, 'Added to favorites successfully', 201);
}));

// DELETE /api/customer/favorites/:id - Remove from favorites
router.delete('/favorites/:id', authenticate, authorize('CUSTOMER'), asyncHandler(async (req, res) => {
  const userId = (req as any).user._id;
  
  await Favorite.findOneAndDelete({ 
    _id: req.params.id,
    user: userId 
  });

  sendSuccess(res, null, 'Removed from favorites successfully');
}));

// ========== ORDERS (Protected) ==========
// GET /api/customer/orders - Get customer's order history
router.get('/orders', authenticate, authorize('CUSTOMER'), asyncHandler(async (req, res) => {
  const userId = (req as any).user._id;
  const { status, page = 1, limit = 10 } = req.query;

  let query: any = { customer: userId };
  if (status && status !== 'all') {
    query.status = status;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [orders, total] = await Promise.all([
    Order.find(query)
      .populate('branch', 'branchName')
      .select('orderNumber status totalAmount items createdAt branch deliveryAddress')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Order.countDocuments(query)
  ]);

  sendSuccess(res, {
    orders: orders.map(o => ({
      id: o._id,
      orderNumber: o.orderNumber,
      status: o.status,
      totalAmount: o.totalAmount,
      items: o.items.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        image: item.image
      })),
      branchName: (o.branch as any)?.branchName || 'Restaurant',
      createdAt: o.createdAt,
      deliveryAddress: o.deliveryAddress
    })),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit))
    }
  }, 'Orders retrieved successfully');
}));

// GET /api/customer/orders/:id - Get order details
router.get('/orders/:id', authenticate, authorize('CUSTOMER'), asyncHandler(async (req, res) => {
  const userId = (req as any).user._id;

  const order = await Order.findOne({ 
    _id: req.params.id,
    customer: userId 
  })
    .populate('branch', 'branchName addressLine phone lat lng')
    .populate('rider', 'name phone')
    .lean();

  if (!order) {
    return sendError(res, 'Order not found', 404);
  }

  sendSuccess(res, {
    order: {
      id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: order.totalAmount,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      tax: order.tax,
      discount: order.discount,
      items: order.items,
      branch: order.branch,
      rider: order.rider,
      deliveryAddress: order.deliveryAddress,
      statusHistory: order.statusHistory || [],
      createdAt: order.createdAt,
      estimatedDelivery: order.estimatedDeliveryTime
    }
  }, 'Order details retrieved successfully');
}));

export default router;
