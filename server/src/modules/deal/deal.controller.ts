import { Request, Response } from 'express';
import { Deal } from '@/models/Deal';
import { Branch } from '@/models/Branch';
import { Product } from '@/models/Product';

export class DealController {
  // Get all deals (with optional filters)
  async getAllDeals(req: Request, res: Response) {
    try {
      const { branch, isActive, page = 1, limit = 50 } = req.query;
      
      const filter: any = { deletedAt: null };
      
      if (branch) {
        filter.$or = [
          { branch: branch },
          { branch: null }
        ];
      }
      
      if (isActive !== undefined) {
        filter.isActive = isActive === 'true';
      }

      const skip = (Number(page) - 1) * Number(limit);
      
      const [deals, total] = await Promise.all([
        Deal.find(filter)
          .populate('branch', 'branchName branchCode')
          .populate('products.product', 'name imageUrl')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit)),
        Deal.countDocuments(filter)
      ]);

      return res.status(200).json({
        success: true,
        data: {
          deals,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error: any) {
      console.error('Error fetching deals:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch deals',
        error: error.message
      });
    }
  }

  // Get active deals
  async getActiveDeals(req: Request, res: Response) {
    try {
      const { branch } = req.query;
      const deals = await Deal.findActive(branch as string);
      
      return res.status(200).json({
        success: true,
        data: { deals }
      });
    } catch (error: any) {
      console.error('Error fetching active deals:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch active deals',
        error: error.message
      });
    }
  }

  // Get deal by ID
  async getDealById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const deal = await Deal.findById(id)
        .populate('branch', 'branchName branchCode')
        .populate('products.product', 'name imageUrl');
      
      if (!deal) {
        return res.status(404).json({
          success: false,
          message: 'Deal not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: { deal }
      });
    } catch (error: any) {
      console.error('Error fetching deal:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch deal',
        error: error.message
      });
    }
  }

  // Create new deal
  async createDeal(req: Request, res: Response) {
    try {
      const dealData = req.body;
      
      // Validate branch if provided
      if (dealData.branch) {
        const branch = await Branch.findById(dealData.branch);
        if (!branch) {
          return res.status(400).json({
            success: false,
            message: 'Branch not found'
          });
        }
      }

      // Validate products if provided
      if (dealData.products && dealData.products.length > 0) {
        const productIds = dealData.products;
        const existingProducts = await Product.find({
          _id: { $in: productIds }
        });
        
        if (existingProducts.length !== productIds.length) {
          return res.status(400).json({
            success: false,
            message: 'Some products not found'
          });
        }

        // Format products for schema
        dealData.products = productIds.map((id: string) => ({ product: id }));
      }

      const deal = new Deal(dealData);
      await deal.save();

      const populatedDeal = await Deal.findById(deal._id)
        .populate('branch', 'branchName branchCode')
        .populate('products.product', 'name imageUrl');

      return res.status(201).json({
        success: true,
        message: 'Deal created successfully',
        data: { deal: populatedDeal }
      });
    } catch (error: any) {
      console.error('Error creating deal:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create deal',
        error: error.message
      });
    }
  }

  // Update deal
  async updateDeal(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Check if deal exists
      const existingDeal = await Deal.findById(id);
      if (!existingDeal) {
        return res.status(404).json({
          success: false,
          message: 'Deal not found'
        });
      }

      // Validate branch if provided
      if (updateData.branch) {
        const branch = await Branch.findById(updateData.branch);
        if (!branch) {
          return res.status(400).json({
            success: false,
            message: 'Branch not found'
          });
        }
      }

      // Validate and format products if provided
      if (updateData.products !== undefined) {
        if (updateData.products.length > 0) {
          const productIds = updateData.products;
          const existingProducts = await Product.find({
            _id: { $in: productIds }
          });
          
          if (existingProducts.length !== productIds.length) {
            return res.status(400).json({
              success: false,
              message: 'Some products not found'
            });
          }

          updateData.products = productIds.map((id: string) => ({ product: id }));
        } else {
          updateData.products = [];
        }
      }

      const deal = await Deal.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      )
        .populate('branch', 'branchName branchCode')
        .populate('products.product', 'name imageUrl');

      return res.status(200).json({
        success: true,
        message: 'Deal updated successfully',
        data: { deal }
      });
    } catch (error: any) {
      console.error('Error updating deal:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update deal',
        error: error.message
      });
    }
  }

  // Soft delete deal
  async deleteDeal(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const deal = await Deal.findById(id);
      if (!deal) {
        return res.status(404).json({
          success: false,
          message: 'Deal not found'
        });
      }

      await deal.softDelete();

      return res.status(200).json({
        success: true,
        message: 'Deal deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting deal:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete deal',
        error: error.message
      });
    }
  }

  // Restore soft-deleted deal
  async restoreDeal(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const deal = await Deal.findOne({ _id: id, deletedAt: { $ne: null } });
      if (!deal) {
        return res.status(404).json({
          success: false,
          message: 'Deal not found or not deleted'
        });
      }

      await deal.restore();

      const restoredDeal = await Deal.findById(id)
        .populate('branch', 'branchName branchCode')
        .populate('products.product', 'name imageUrl');

      return res.status(200).json({
        success: true,
        message: 'Deal restored successfully',
        data: { deal: restoredDeal }
      });
    } catch (error: any) {
      console.error('Error restoring deal:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to restore deal',
        error: error.message
      });
    }
  }
}
