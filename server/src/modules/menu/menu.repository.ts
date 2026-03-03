import { MenuItem } from '@/models/Menu';
import { Category } from '@/models/Category';
import { Types } from 'mongoose';

export class MenuRepository {
  // Menu Item methods
  async createMenuItem(itemData: any): Promise<any> {
    const menuItem = new MenuItem(itemData);
    return await menuItem.save();
  }

  async createProduct(productData: any): Promise<any> {
    const product = new MenuItem(productData);
    return await product.save();
  }

  async updateProduct(id: string | Types.ObjectId, updateData: any): Promise<any | null> {
    return await this.updateMenuItem(id, updateData);
  }

  async findMenuItemById(id: string | Types.ObjectId): Promise<any | null> {
    return await MenuItem.findById(id)
      .populate('category', 'name description');
  }

  async updateMenuItem(id: string | Types.ObjectId, updateData: any): Promise<any | null> {
    return await MenuItem.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('category', 'name description');
  }

  async deleteMenuItem(id: string | Types.ObjectId): Promise<boolean> {
    const result = await MenuItem.findByIdAndDelete(id);
    return !!result;
  }

  async getMenuItemsByRestaurant(
    restaurantId: string | Types.ObjectId,
    page: number = 1,
    limit: number = 50,
    filter: any = {}
  ): Promise<{ items: any[]; total: number }> {
    const skip = (page - 1) * limit;
    
    const [items, total] = await Promise.all([
      MenuItem.find({ restaurant: restaurantId, ...filter })
        .populate('category', 'name description')
        .sort('category displayOrder name')
        .skip(skip)
        .limit(limit),
      MenuItem.countDocuments({ restaurant: restaurantId, ...filter })
    ]);

    return { items, total };
  }

  async getMenuItemsByCategory(
    categoryId: string | Types.ObjectId,
    page: number = 1,
    limit: number = 50
  ): Promise<{ items: any[]; total: number }> {
    const skip = (page - 1) * limit;
    
    const [items, total] = await Promise.all([
      MenuItem.find({ category: categoryId, isAvailable: true })
        .populate('category', 'name description')
        .sort('name')
        .skip(skip)
        .limit(limit),
      MenuItem.countDocuments({ category: categoryId, isAvailable: true })
    ]);

    return { items, total };
  }

  async searchMenuItems(
    restaurantId: string | Types.ObjectId,
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ items: any[]; total: number }> {
    const skip = (page - 1) * limit;
    
    const [items, total] = await Promise.all([
      MenuItem.find({
        restaurant: restaurantId,
        isAvailable: true,
        $text: { $search: query },
      }, { score: { $meta: 'textScore' } })
        .populate('category', 'name description')
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit),
      MenuItem.countDocuments({
        restaurant: restaurantId,
        isAvailable: true,
        $text: { $search: query },
      }),
    ]);

    return { items, total };
  }

  async getFilteredMenuItems(
    restaurantId: string | Types.ObjectId,
    filters: {
      isVegetarian?: boolean;
      isVegan?: boolean;
      isGlutenFree?: boolean;
      isSpicy?: boolean;
      minPrice?: number;
      maxPrice?: number;
    },
    page: number = 1,
    limit: number = 20
  ): Promise<{ items: any[]; total: number }> {
    const skip = (page - 1) * limit;
    
    const filter: any = {
      restaurant: restaurantId,
      isAvailable: true,
      ...filters,
    };

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      filter.price = {};
      if (filters.minPrice !== undefined) filter.price.$gte = filters.minPrice;
      if (filters.maxPrice !== undefined) filter.price.$lte = filters.maxPrice;
      delete filter.minPrice;
      delete filter.maxPrice;
    }

    const [items, total] = await Promise.all([
      MenuItem.find(filter)
        .populate('category', 'name description')
        .sort('category displayOrder name')
        .skip(skip)
        .limit(limit),
      MenuItem.countDocuments(filter)
    ]);

    return { items, total };
  }

  async getPopularItems(
    restaurantId: string | Types.ObjectId,
    limit: number = 10
  ): Promise<any[]> {
    // This would typically be based on order frequency
    // For now, we'll return available items sorted by creation date
    return await MenuItem.find({
      restaurant: restaurantId,
      isAvailable: true,
    })
      .populate('category', 'name description')
      .sort('-createdAt')
      .limit(limit);
  }

  // Menu Category methods
  async createCategory(categoryData: any): Promise<any> {
    const category = new Category(categoryData);
    return await category.save();
  }

  async findCategoryById(id: string | Types.ObjectId): Promise<any | null> {
    return await Category.findById(id);
  }

  async updateCategory(id: string | Types.ObjectId, updateData: any): Promise<any | null> {
    return await Category.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
  }

  async deleteCategory(id: string | Types.ObjectId): Promise<boolean> {
    // Check if category has menu items
    const itemsCount = await MenuItem.countDocuments({ category: id });
    if (itemsCount > 0) {
      throw new Error('Cannot delete category with existing menu items');
    }

    const result = await Category.findByIdAndDelete(id);
    return !!result;
  }

  async getCategoriesByRestaurant(
    restaurantId: string | Types.ObjectId,
    includeInactive: boolean = false
  ): Promise<any[]> {
    const filter = { restaurant: restaurantId };
    if (!includeInactive) {
      (filter as any).isActive = true;
    }

    return await Category.find(filter)
      .sort('displayOrder name');
  }

  async reorderCategories(
    restaurantId: string | Types.ObjectId,
    categoryOrders: { categoryId: string; displayOrder: number }[]
  ): Promise<void> {
    const updatePromises = categoryOrders.map(({ categoryId, displayOrder }) =>
      Category.findByIdAndUpdate(categoryId, { displayOrder })
    );

    await Promise.all(updatePromises);
  }

  async getFullMenu(restaurantId: string | Types.ObjectId): Promise<{
    categories: any[];
  }> {
    const categories = await this.getCategoriesByRestaurant(restaurantId);
    
    const categoriesWithItems = await Promise.all(
      categories.map(async (category) => {
        const items = await MenuItem.find({
          restaurant: restaurantId,
          category: category._id,
          isAvailable: true,
        }).sort('name');

        return {
          ...category.toObject(),
          items,
        };
      })
    );

    return { categories: categoriesWithItems };
  }

  // Admin methods for system-wide menu management
  async findAllProducts(filter: any = {}, page: number = 1, limit: number = 10): Promise<any[]> {
    const skip = (page - 1) * limit;

    return await MenuItem.find(filter)
      .populate('category', 'name description')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  async countProducts(filter: any = {}): Promise<number> {
    return await MenuItem.countDocuments(filter);
  }

  async findAllCategories(): Promise<any[]> {
    console.log('🔍 findAllCategories: Starting query');
    const categories = await Category.find()
      .sort({ name: 1 });
    console.log('🔍 findAllCategories: Found', categories.length, 'categories');
    console.log('🔍 findAllCategories: Sample:', categories.slice(0, 2).map(c => ({ name: c.name, id: c._id })));
    return categories;
  }

  async updateCategory(id: string, categoryData: any): Promise<any> {
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { ...categoryData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!updatedCategory) {
      throw new Error('Category not found');
    }
    return updatedCategory;
  }
}
