import { Request } from 'express';
import { Document, Types, Model } from 'mongoose';

// Base interface for all documents
export interface BaseDocument extends Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// User related types
export interface IUser extends BaseDocument {
  email: string;
  passwordHash: string;
  displayName?: string;
  phoneNumber?: string;
  role: 'CUSTOMER' | 'RIDER' | 'ADMIN' | 'WAITER' | 'CHEF' | 'BRANCH_MANAGER' | 'SUPER_ADMIN';
  profileImage?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  isActive: boolean;
  // For Riders
  vehicleNumber?: string;
  vehicleType?: string;
  // For Chefs
  specialization?: string;
  // For Waiters
  assignedSection?: string;
  // Branch Assignment for staff members
  assignedBranch?: Types.ObjectId;
  fcmToken?: string;
  lastLoginAt?: Date;
  deletedAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  getPublicProfile(): any;
  softDelete(): Promise<IUser>;
  restore(): Promise<IUser>;
}

// Restaurant related types
export interface IRestaurant extends BaseDocument {
  name: string;
  description: string;
  owner: Types.ObjectId;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  phone: string;
  email: string;
  website?: string;
  cuisine: string[];
  priceRange: '$' | '$$' | '$$$' | '$$$$';
  rating: number;
  reviewCount: number;
  deliveryTime: number;
  deliveryFee: number;
  minOrderAmount: number;
  isActive: boolean;
  operatingHours: {
    monday: { open: string; close: string } | null;
    tuesday: { open: string; close: string } | null;
    wednesday: { open: string; close: string } | null;
    thursday: { open: string; close: string } | null;
    friday: { open: string; close: string } | null;
    saturday: { open: string; close: string } | null;
    sunday: { open: string; close: string } | null;
  };
  images: string[];
}

// Restaurant Table related types
export interface IRestaurantTable extends BaseDocument {
  branch: Types.ObjectId;
  tableNumber: string;
  seatingCapacity: number;
  section?: string;
  floorNumber: number;
  qrCodeUrl?: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'OUT_OF_SERVICE';
  currentWaiter?: Types.ObjectId;
  deletedAt?: Date;
  changeStatus(newStatus: string, waiterId?: string): Promise<IRestaurantTable>;
  isAvailable(): boolean;
  assignWaiter(waiterId: string): Promise<IRestaurantTable>;
  releaseTable(): Promise<IRestaurantTable>;
  softDelete(): Promise<IRestaurantTable>;
  restore(): Promise<IRestaurantTable>;
}

export interface IRestaurantTableModel extends Model<IRestaurantTable> {
  findByBranch(branchId: string, status?: string): Promise<IRestaurantTable[]>;
  findAvailable(branchId: string, capacity?: number): Promise<IRestaurantTable[]>;
  findByWaiter(waiterId: string): Promise<IRestaurantTable[]>;
  getTableStats(branchId: string): Promise<any[]>;
}

// Menu related types
export interface IMenuItem extends BaseDocument {
  restaurant: Types.ObjectId;
  category: Types.ObjectId;
  name: string;
  description: string;
  price: number;
  images: string[];
  ingredients: string[];
  allergens: string[];
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isSpicy: boolean;
  isAvailable: boolean;
  preparationTime: number;
  nutritionInfo?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface IMenuCategory extends BaseDocument {
  restaurant: Types.ObjectId;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
}

// Order related types
export interface IOrder extends BaseDocument {
  customer: Types.ObjectId;
  restaurant: Types.ObjectId;
  items: {
    menuItem: Types.ObjectId;
    quantity: number;
    price: number;
    customizations?: string[];
  }[];
  totalAmount: number;
  deliveryFee: number;
  tax: number;
  finalAmount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod: 'cash' | 'card' | 'digital_wallet';
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  deliveryInstructions?: string;
  estimatedDeliveryTime: Date;
  actualDeliveryTime?: Date;
  driver?: Types.ObjectId;
  rating?: number;
  review?: string;
  orderType: 'delivery' | 'pickup';
}

// Auth related types
export interface IAuthRequest extends Request {
  user?: IUser;
}

export interface IJWTPayload {
  userId: string;
  email: string;
  role: string;
  assignedBranch?: string;
}

// API Response types
export interface IApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  statusCode: number;
}

export interface IPaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface IPaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Validation types
export interface IValidationError {
  field: string;
  message: string;
}

export interface ICustomError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}
