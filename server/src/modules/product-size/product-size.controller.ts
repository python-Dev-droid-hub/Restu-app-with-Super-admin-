import { Request, Response } from 'express';
import { ProductSize } from '@/models/ProductSize';
import { Size } from '@/models/Size';
import { Product } from '@/models/Product';

const productSizeModel = ProductSize as any;

export class ProductSizeController {
  private syncProductBasePriceFromSizes = async (productId: any): Promise<void> => {
    const sizes = await ProductSize.find({
      product: productId,
      deletedAt: null,
      isAvailable: true,
    })
      .select('price isDefault')
      .lean();

    if (!sizes || sizes.length === 0) return;

    let computed: number | undefined;
    for (const s of sizes as any[]) {
      const price = typeof s.price === 'number' && !Number.isNaN(s.price) ? s.price : 0;
      if (s.isDefault) {
        computed = price;
        break;
      }
      if (computed === undefined) computed = price;
      else computed = Math.min(computed, price);
    }

    if (computed === undefined) return;

    await Product.updateOne(
      { _id: productId },
      { $set: { price: computed, hasSizes: true } }
    );
  };

  // Get all sizes (master list) - show all for admin management
  async getAllSizes(req: Request, res: Response) {
    try {
      console.log('🔵 [GET SIZES] Fetching all sizes');
      const sizes = await Size.find({ deletedAt: null })
        .sort({ display_order: 1 });

      console.log('✅ [GET SIZES] Found sizes:', sizes.length);
      console.log('✅ [GET SIZES] Raw sizes data:', JSON.stringify(sizes, null, 2));

      // Map _id to id for mobile app compatibility
      const transformedSizes = sizes.map(size => ({
        id: size._id.toString(),
        size_name: size.size_name,
        display_order: size.display_order,
        is_active: size.is_active,
        _id: size._id
      }));

      console.log('✅ [GET SIZES] Transformed sizes data:', JSON.stringify(transformedSizes, null, 2));

      return res.status(200).json({
        success: true,
        data: { sizes: transformedSizes }
      });
    } catch (error: any) {
      console.error('❌ [GET SIZES] Error fetching sizes:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch sizes',
        error: error.message
      });
    }
  }

  // Create new size (master)
  async createSize(req: Request, res: Response) {
    try {
      console.log('🔵 [CREATE SIZE] Request received');
      console.log('🔵 [CREATE SIZE] Request body:', JSON.stringify(req.body, null, 2));
      console.log('🔵 [CREATE SIZE] User:', (req as any).user?.id || 'Unknown');
      
      const sizeData = req.body;

      console.log('🔵 [CREATE SIZE] Creating size with data:', sizeData);
      const size = new Size(sizeData);
      
      console.log('🔵 [CREATE SIZE] Size instance created, saving to database...');
      await size.save();
      
      console.log('✅ [CREATE SIZE] Size saved successfully:', JSON.stringify(size, null, 2));

      return res.status(201).json({
        success: true,
        message: 'Size created successfully',
        data: { size }
      });
    } catch (error: any) {
      console.error('❌ [CREATE SIZE] Error:', error);
      console.error('❌ [CREATE SIZE] Error message:', error.message);
      console.error('❌ [CREATE SIZE] Error stack:', error.stack);
      return res.status(500).json({
        success: false,
        message: 'Failed to create size',
        error: error.message
      });
    }
  }

  // Update size
  async updateSize(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const size = await Size.findById(id);
      if (!size) {
        return res.status(404).json({
          success: false,
          message: 'Size not found'
        });
      }

      // Update fields
      if (updateData.size_name !== undefined) {
        size.size_name = updateData.size_name;
      }
      if (updateData.display_order !== undefined) {
        size.display_order = updateData.display_order;
      }
      if (updateData.is_active !== undefined) {
        size.is_active = updateData.is_active;
      }

      await size.save();

      return res.status(200).json({
        success: true,
        message: 'Size updated successfully',
        data: { size }
      });
    } catch (error: any) {
      console.error('Error updating size:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update size',
        error: error.message
      });
    }
  }

  // Get product sizes
  async getProductSizes(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      
      // Verify product exists
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      const productSizes = await productSizeModel.findByProduct(productId);

      return res.status(200).json({
        success: true,
        data: {
          product,
          productSizes,
          hasSizes: product.hasSizes
        }
      });
    } catch (error: any) {
      console.error('Error fetching product sizes:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch product sizes',
        error: error.message
      });
    }
  }

  // Get default product size
  async getDefaultProductSize(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      
      const productSize = await productSizeModel.findDefaultByProduct(productId);

      if (!productSize) {
        return res.status(404).json({
          success: false,
          message: 'Default size not found for this product'
        });
      }

      return res.status(200).json({
        success: true,
        data: { productSize }
      });
    } catch (error: any) {
      console.error('Error fetching default product size:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch default product size',
        error: error.message
      });
    }
  }

  // Create product size (bulk assignment supported)
  async createProductSize(req: Request, res: Response) {
    try {
      const { product, size, price, isDefault, isAvailable, sizeIds } = req.body;
      
      // Handle bulk assignment if sizeIds array is provided
      if (sizeIds && Array.isArray(sizeIds) && sizeIds.length > 0) {
        const createdAssignments = [];
        const errors = [];
        
        for (const sizeId of sizeIds) {
          try {
            // Check if this combination already exists
            const existingProductSize = await ProductSize.findOne({
              product: product,
              size: sizeId,
              deletedAt: null
            });
            
            if (existingProductSize) {
              errors.push(`Size ${sizeId} is already assigned to this product`);
              continue;
            }
            
            const productSize = await productSizeModel.createProductSize({
              product,
              size: sizeId,
              price: price || 0,
              isDefault: isDefault || false,
              isAvailable: isAvailable !== false
            });
            
            const populatedProductSize = await ProductSize.findById(productSize._id)
              .populate('size')
              .populate('product', 'name');
              
            createdAssignments.push(populatedProductSize);
          } catch (error: any) {
            errors.push(`Failed to assign size ${sizeId}: ${error.message}`);
          }
        }
        
        await this.syncProductBasePriceFromSizes(product);

        return res.status(201).json({
          success: true,
          message: `Assigned ${createdAssignments.length} sizes to product`,
          data: { 
            productSizes: createdAssignments,
            errors: errors.length > 0 ? errors : undefined
          }
        });
      }
      
      // Single assignment
      if (!product || !size) {
        return res.status(400).json({
          success: false,
          message: 'Product and size are required'
        });
      }
      
      // Check if this combination already exists
      const existingProductSize = await ProductSize.findOne({
        product,
        size,
        deletedAt: null
      });
      
      if (existingProductSize) {
        return res.status(400).json({
          success: false,
          message: 'This product size combination already exists'
        });
      }

      const productSize = await productSizeModel.createProductSize({
        product,
        size,
        price: price || 0,
        isDefault: isDefault || false,
        isAvailable: isAvailable !== false
      });
      
      const populatedProductSize = await ProductSize.findById(productSize._id)
        .populate('size')
        .populate('product', 'name');

      await this.syncProductBasePriceFromSizes(product);

      return res.status(201).json({
        success: true,
        message: 'Product size created successfully',
        data: { productSize: populatedProductSize }
      });
    } catch (error: any) {
      console.error('Error creating product size:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create product size',
        error: error.message
      });
    }
  }

  // Update product size
  async updateProductSize(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const productSize = await ProductSize.findById(id);
      if (!productSize) {
        return res.status(404).json({
          success: false,
          message: 'Product size not found'
        });
      }

      // Handle setting as default
      if (updateData.isDefault === true) {
        await (productSize as any).setAsDefault();
      }

      // Update other fields
      if (updateData.price !== undefined) {
        productSize.price = updateData.price;
      }
      if (updateData.isAvailable !== undefined) {
        productSize.isAvailable = updateData.isAvailable;
      }

      await productSize.save();

      await this.syncProductBasePriceFromSizes(productSize.product);

      const updatedProductSize = await ProductSize.findById(id)
        .populate('size')
        .populate('product', 'name');

      return res.status(200).json({
        success: true,
        message: 'Product size updated successfully',
        data: { productSize: updatedProductSize }
      });
    } catch (error: any) {
      console.error('Error updating product size:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update product size',
        error: error.message
      });
    }
  }

  // Soft delete product size
  async deleteProductSize(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const productSize = await ProductSize.findById(id);
      if (!productSize) {
        return res.status(404).json({
          success: false,
          message: 'Product size not found'
        });
      }

      await (productSize as any).softDelete();

      await this.syncProductBasePriceFromSizes(productSize.product);

      return res.status(200).json({
        success: true,
        message: 'Product size deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting product size:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete product size',
        error: error.message
      });
    }
  }

  // Restore soft-deleted product size
  async restoreProductSize(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const productSize = await ProductSize.findOne({ _id: id, deletedAt: { $ne: null } });
      if (!productSize) {
        return res.status(404).json({
          success: false,
          message: 'Product size not found or not deleted'
        });
      }

      const productId = productSize.product;

      await (productSize as any).restore();

      await this.syncProductBasePriceFromSizes(productId);

      const restoredProductSize = await ProductSize.findById(id)
        .populate('size')
        .populate('product', 'name');

      return res.status(200).json({
        success: true,
        message: 'Product size restored successfully',
        data: { productSize: restoredProductSize }
      });
    } catch (error: any) {
      console.error('Error restoring product size:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to restore product size',
        error: error.message
      });
    }
  }

  // Delete size (soft delete)
  async deleteSize(req: Request, res: Response) {
    try {
      const { id } = req.params;
      console.log('🗑️ [DELETE SIZE] Deleting size with ID:', id);

      const size = await Size.findById(id);
      if (!size) {
        console.log('🗑️ [DELETE SIZE] Size not found:', id);
        return res.status(404).json({
          success: false,
          message: 'Size not found'
        });
      }

      // Check if size is used by any products
      const productSizeCount = await ProductSize.countDocuments({ 
        size: id, 
        deletedAt: null 
      });
      
      if (productSizeCount > 0) {
        console.log('🗑️ [DELETE SIZE] Cannot delete size - used by', productSizeCount, 'products');
        return res.status(400).json({
          success: false,
          message: 'Cannot delete size that is currently assigned to products'
        });
      }

      // Soft delete the size
      await (size as any).softDelete();
      console.log('✅ [DELETE SIZE] Size soft deleted successfully:', id);

      return res.status(200).json({
        success: true,
        message: 'Size deleted successfully'
      });
    } catch (error: any) {
      console.error('❌ [DELETE SIZE] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete size',
        error: error.message
      });
    }
  }

  // Set product size as default
  async setDefaultSize(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const productSize = await ProductSize.findById(id);
      if (!productSize) {
        return res.status(404).json({
          success: false,
          message: 'Product size not found'
        });
      }

      await (productSize as any).setAsDefault();

      const updatedProductSize = await ProductSize.findById(id)
        .populate('size')
        .populate('product', 'name');

      return res.status(200).json({
        success: true,
        message: 'Product size set as default',
        data: { productSize: updatedProductSize }
      });
    } catch (error: any) {
      console.error('Error setting default product size:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to set default product size',
        error: error.message
      });
    }
  }
}
