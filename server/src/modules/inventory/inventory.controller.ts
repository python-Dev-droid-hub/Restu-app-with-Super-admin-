import { Request, Response } from 'express';
import { InventoryRepository } from './inventory.repository';

export class InventoryController {
  private inventoryRepository: InventoryRepository;

  constructor() {
    this.inventoryRepository = new InventoryRepository();
  }

  // Get all inventory items
  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const { branch, product, lowStock, category } = req.query;
      const filters: any = {};

      if (branch) filters.branch = branch;
      if (product) filters.product = product;
      if (lowStock === 'true') filters.lowStock = true;
      if (category) filters.category = category;

      const items = await this.inventoryRepository.findAll(filters);

      res.json({
        success: true,
        data: { items }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch inventory'
      });
    }
  };

  // Get inventory by branch
  getByBranch = async (req: Request, res: Response): Promise<void> => {
    try {
      const { branchId } = req.params;
      const { lowStock } = req.query;

      const items = await this.inventoryRepository.findByBranch(
        branchId,
        lowStock === 'true'
      );

      res.json({
        success: true,
        data: { items }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch inventory'
      });
    }
  };

  // Get low stock items
  getLowStock = async (req: Request, res: Response): Promise<void> => {
    try {
      const { branchId } = req.query;

      const items = await this.inventoryRepository.findLowStock(branchId as string);

      res.json({
        success: true,
        data: { items }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch low stock items'
      });
    }
  };

  // Get single inventory item
  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const item = await this.inventoryRepository.findById(id);

      if (!item) {
        res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
        return;
      }

      res.json({
        success: true,
        data: { item }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch inventory item'
      });
    }
  };

  // Create inventory item
  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const itemData = req.body;
      const item = await this.inventoryRepository.create(itemData);

      res.status(201).json({
        success: true,
        data: { item },
        message: 'Inventory item created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create inventory item'
      });
    }
  };

  // Bulk add/update inventory items
  bulkAdd = async (req: Request, res: Response): Promise<void> => {
    try {
      const { items } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Items array is required and must not be empty'
        });
        return;
      }

      const results = await this.inventoryRepository.bulkUpsert(items);

      res.status(201).json({
        success: true,
        data: { items: results },
        message: `${results.length} inventory items processed successfully`
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process bulk inventory'
      });
    }
  };

  // Update inventory item
  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const item = await this.inventoryRepository.update(id, updateData);

      if (!item) {
        res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
        return;
      }

      res.json({
        success: true,
        data: { item },
        message: 'Inventory item updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update inventory item'
      });
    }
  };

  // Add stock to item
  addStock = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { quantity } = req.body;

      if (!quantity || quantity <= 0) {
        res.status(400).json({
          success: false,
          message: 'Valid positive quantity is required'
        });
        return;
      }

      const item = await this.inventoryRepository.addStock(id, quantity);

      if (!item) {
        res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
        return;
      }

      res.json({
        success: true,
        data: { item },
        message: 'Stock added successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add stock'
      });
    }
  };

  // Remove stock from item
  removeStock = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { quantity } = req.body;

      if (!quantity || quantity <= 0) {
        res.status(400).json({
          success: false,
          message: 'Valid positive quantity is required'
        });
        return;
      }

      const item = await this.inventoryRepository.removeStock(id, quantity);

      if (!item) {
        res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
        return;
      }

      res.json({
        success: true,
        data: { item },
        message: 'Stock removed successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to remove stock'
      });
    }
  };

  // Delete inventory item (soft delete)
  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const item = await this.inventoryRepository.softDelete(id);

      if (!item) {
        res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Inventory item deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete inventory item'
      });
    }
  };

  // Get inventory statistics
  getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { branchId } = req.query;
      const stats = await this.inventoryRepository.getStats(branchId as string);

      res.json({
        success: true,
        data: { stats: stats[0] || { totalProducts: 0, totalQuantity: 0, lowStockItems: 0, outOfStockItems: 0 } }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch inventory statistics'
      });
    }
  };

  // Get categories
  getCategories = async (req: Request, res: Response): Promise<void> => {
    try {
      const { branchId } = req.query;
      const categories = await this.inventoryRepository.getCategories(branchId as string);

      res.json({
        success: true,
        data: { categories }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch categories'
      });
    }
  };
}
