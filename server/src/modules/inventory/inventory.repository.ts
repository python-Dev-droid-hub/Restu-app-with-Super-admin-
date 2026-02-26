import { BranchInventory } from '@/models/BranchInventory';
import mongoose from 'mongoose';

export class InventoryRepository {
  // Get all inventory items with filtering
  async findAll(filters: any = {}) {
    const query: any = {};
    
    if (filters.branch) query.branch = filters.branch;
    if (filters.product) query.product = filters.product;
    if (filters.lowStock) {
      query.$expr = { $lte: ['$quantityAvailable', '$reorderLevel'] };
    }
    if (filters.category) query.category = filters.category;
    
    return BranchInventory.find(query)
      .populate('branch', 'branchName branchCode')
      .populate('product', 'name imageUrl hasSizes')
      .sort({ quantityAvailable: 1 });
  }

  // Find by branch
  async findByBranch(branchId: string, includeLowStock?: boolean) {
    const filter: any = { branch: branchId };
    
    if (includeLowStock) {
      filter.$expr = { $lte: ['$quantityAvailable', '$reorderLevel'] };
    }
    
    return BranchInventory.find(filter)
      .populate('product', 'name imageUrl hasSizes')
      .sort({ quantityAvailable: 1 });
  }

  // Find low stock items
  async findLowStock(branchId?: string) {
    const filter: any = {
      $expr: { $lte: ['$quantityAvailable', '$reorderLevel'] }
    };
    
    if (branchId) {
      filter.branch = branchId;
    }
    
    return BranchInventory.find(filter)
      .populate('branch', 'branchName branchCode')
      .populate('product', 'name imageUrl')
      .sort({ quantityAvailable: 1 });
  }

  // Find by ID
  async findById(id: string) {
    return BranchInventory.findById(id)
      .populate('branch', 'branchName branchCode')
      .populate('product', 'name imageUrl hasSizes');
  }

  // Find by product
  async findByProduct(productId: string) {
    return BranchInventory.find({ product: productId })
      .populate('branch', 'branchName branchCode')
      .sort({ quantityAvailable: -1 });
  }

  // Create inventory item
  async create(data: any) {
    const inventory = new BranchInventory(data);
    return inventory.save();
  }

  // Update inventory item
  async update(id: string, data: any) {
    return BranchInventory.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    )
      .populate('branch', 'branchName branchCode')
      .populate('product', 'name imageUrl hasSizes');
  }

  // Bulk add/update inventory items
  async bulkUpsert(items: any[]) {
    const results = [];
    
    for (const item of items) {
      const existing = await BranchInventory.findOne({
        branch: item.branch,
        product: item.product
      });
      
      if (existing) {
        existing.quantityAvailable = item.quantityAvailable;
        if (item.reorderLevel !== undefined) {
          existing.reorderLevel = item.reorderLevel;
        }
        if (item.category !== undefined) {
          existing.category = item.category;
        }
        existing.lastRestockedAt = new Date();
        await existing.save();
        results.push(existing);
      } else {
        const newInventory = new BranchInventory({
          branch: item.branch,
          product: item.product,
          quantityAvailable: item.quantityAvailable,
          reorderLevel: item.reorderLevel || 10,
          category: item.category,
          lastRestockedAt: new Date()
        });
        await newInventory.save();
        results.push(newInventory);
      }
    }
    
    return results;
  }

  // Add stock
  async addStock(id: string, quantity: number) {
    const inventory = await BranchInventory.findById(id);
    if (!inventory) return null;
    
    if (quantity <= 0) {
      throw new Error('Quantity to add must be positive');
    }
    
    inventory.quantityAvailable += quantity;
    inventory.lastRestockedAt = new Date();
    return inventory.save();
  }

  // Remove stock
  async removeStock(id: string, quantity: number) {
    const inventory = await BranchInventory.findById(id);
    if (!inventory) return null;
    
    if (quantity <= 0) {
      throw new Error('Quantity to remove must be positive');
    }
    
    if (inventory.quantityAvailable < quantity) {
      throw new Error('Insufficient stock available');
    }
    
    inventory.quantityAvailable -= quantity;
    return inventory.save();
  }

  // Soft delete
  async softDelete(id: string) {
    return BranchInventory.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { new: true }
    );
  }

  // Restore
  async restore(id: string) {
    return BranchInventory.findByIdAndUpdate(
      id,
      { deletedAt: null },
      { new: true }
    );
  }

  // Get inventory statistics
  async getStats(branchId?: string) {
    const matchStage: any = {};
    if (branchId) {
      matchStage.branch = new mongoose.Types.ObjectId(branchId);
    }
    
    return BranchInventory.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalQuantity: { $sum: '$quantityAvailable' },
          lowStockItems: {
            $sum: {
              $cond: [{ $lte: ['$quantityAvailable', '$reorderLevel'] }, 1, 0]
            }
          },
          outOfStockItems: {
            $sum: {
              $cond: [{ $eq: ['$quantityAvailable', 0] }, 1, 0]
            }
          }
        }
      }
    ]);
  }

  // Check availability
  async checkAvailability(branchId: string, productId: string, quantity: number): Promise<boolean> {
    const inventory = await BranchInventory.findOne({ branch: branchId, product: productId });
    
    if (!inventory) {
      return false;
    }
    
    return inventory.quantityAvailable >= quantity;
  }

  // Get inventory by IDs
  async findByIds(ids: string[]) {
    return BranchInventory.find({
      _id: { $in: ids.map(id => new mongoose.Types.ObjectId(id)) }
    })
      .populate('branch', 'branchName branchCode')
      .populate('product', 'name imageUrl hasSizes');
  }

  // Get distinct categories
  async getCategories(branchId?: string) {
    const match: any = {};
    if (branchId) match.branch = new mongoose.Types.ObjectId(branchId);
    
    return BranchInventory.aggregate([
      { $match: match },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
  }
}
