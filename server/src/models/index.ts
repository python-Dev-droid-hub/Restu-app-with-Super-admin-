// Core Models
export * from './User';
export { User } from './User';

// Branch & Location Models (New)
export * from './Branch';
export { Branch } from './Branch';
export * from './RestaurantTable';
export { RestaurantTable } from './RestaurantTable';
export * from './CustomerAddress';
export { CustomerAddress } from './CustomerAddress';

// Product & Menu Models (Updated)
export * from './Product';
export { Product } from './Product';
export * from './Category';
export { Category } from './Category';
export * from './Size';
export { Size } from './Size';
export * from './ProductSize';
export { ProductSize } from './ProductSize';
export * from './ProductCustomization';
export { ProductCustomization } from './ProductCustomization';

// Order & Payment Models (Updated)
export * from './Order';
export { Order } from './Order';
export * from './OrderRejection';
export { OrderRejection } from './OrderRejection';
export * from './Payment';
export { Payment } from './Payment';

// Promotion Models (New)
export * from './Deal';
export { Deal } from './Deal';
export * from './DealProduct';
export { DealProduct } from './DealProduct';
export * from './Coupon';
export { Coupon, CouponRedemption } from './Coupon';

// Communication Models (New)
export * from './Notification';
export { Notification } from './Notification';

// Inventory Models (New)
export * from './BranchInventory';
export { BranchInventory } from './BranchInventory';

// System Settings
export * from './SystemSetting';
export { SystemSetting } from './SystemSetting';

// Legacy Models (Deprecated - use new models instead)
export * from './Restaurant';
export * from './Menu';

// Re-exports for backward compatibility
export { Branch as Restaurant } from './Branch';
export { Product as MenuItem } from './Product';
export { Category as MenuCategory } from './Category';
