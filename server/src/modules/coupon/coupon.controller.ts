import { Request, Response } from 'express';
import { Coupon } from '@/models/Coupon';
import { Branch } from '@/models/Branch';

export class CouponController {
  // Get all coupons (with optional filters)
  async getAllCoupons(req: Request, res: Response) {
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
      
      const [coupons, total] = await Promise.all([
        Coupon.find(filter)
          .populate('branch', 'branchName branchCode')
          .populate('createdBy', 'displayName email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit)),
        Coupon.countDocuments(filter)
      ]);

      return res.status(200).json({
        success: true,
        data: {
          coupons,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error: any) {
      console.error('Error fetching coupons:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch coupons',
        error: error.message
      });
    }
  }

  // Get active coupons
  async getActiveCoupons(req: Request, res: Response) {
    try {
      const { branch } = req.query;
      const coupons = await Coupon.findActive(branch as string);
      
      return res.status(200).json({
        success: true,
        data: { coupons }
      });
    } catch (error: any) {
      console.error('Error fetching active coupons:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch active coupons',
        error: error.message
      });
    }
  }

  // Get coupon by ID
  async getCouponById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const coupon = await Coupon.findById(id)
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'displayName email');
      
      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: { coupon }
      });
    } catch (error: any) {
      console.error('Error fetching coupon:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch coupon',
        error: error.message
      });
    }
  }

  // Create new coupon
  async createCoupon(req: Request, res: Response) {
    try {
      const couponData = {
        ...req.body,
        createdBy: (req as any).user._id
      };
      
      // Validate branch if provided
      if (couponData.branch) {
        const branch = await Branch.findById(couponData.branch);
        if (!branch) {
          return res.status(400).json({
            success: false,
            message: 'Branch not found'
          });
        }
      }

      // Check if code already exists
      const existingCoupon = await Coupon.findOne({
        code: couponData.code.toUpperCase(),
        deletedAt: null
      });

      if (existingCoupon) {
        return res.status(400).json({
          success: false,
          message: 'Coupon code already exists'
        });
      }

      const coupon = new Coupon(couponData);
      await coupon.save();

      const populatedCoupon = await Coupon.findById(coupon._id)
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'displayName email');

      return res.status(201).json({
        success: true,
        message: 'Coupon created successfully',
        data: { coupon: populatedCoupon }
      });
    } catch (error: any) {
      console.error('Error creating coupon:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create coupon',
        error: error.message
      });
    }
  }

  // Update coupon
  async updateCoupon(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Check if coupon exists
      const existingCoupon = await Coupon.findById(id);
      if (!existingCoupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found'
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

      const coupon = await Coupon.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      )
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'displayName email');

      return res.status(200).json({
        success: true,
        message: 'Coupon updated successfully',
        data: { coupon }
      });
    } catch (error: any) {
      console.error('Error updating coupon:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update coupon',
        error: error.message
      });
    }
  }

  // Soft delete coupon
  async deleteCoupon(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const coupon = await Coupon.findById(id);
      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found'
        });
      }

      await coupon.softDelete();

      return res.status(200).json({
        success: true,
        message: 'Coupon deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting coupon:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete coupon',
        error: error.message
      });
    }
  }

  // Restore soft-deleted coupon
  async restoreCoupon(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const coupon = await Coupon.findOne({ _id: id, deletedAt: { $ne: null } });
      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found or not deleted'
        });
      }

      await coupon.restore();

      const restoredCoupon = await Coupon.findById(id)
        .populate('branch', 'branchName branchCode')
        .populate('createdBy', 'displayName email');

      return res.status(200).json({
        success: true,
        message: 'Coupon restored successfully',
        data: { coupon: restoredCoupon }
      });
    } catch (error: any) {
      console.error('Error restoring coupon:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to restore coupon',
        error: error.message
      });
    }
  }

  // Validate coupon for order
  async validateCoupon(req: Request, res: Response) {
    try {
      const { code, orderAmount, branch } = req.body;
      const customerId = (req as any).user._id;

      try {
        const result = await Coupon.validateForCustomer(
          code,
          customerId,
          orderAmount,
          branch
        );

        return res.status(200).json({
          success: true,
          data: {
            valid: true,
            coupon: result.coupon,
            discountAmount: result.discountAmount,
            finalAmount: result.finalAmount
          }
        });
      } catch (validationError: any) {
        return res.status(400).json({
          success: false,
          message: validationError.message,
          data: { valid: false }
        });
      }
    } catch (error: any) {
      console.error('Error validating coupon:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to validate coupon',
        error: error.message
      });
    }
  }
}
