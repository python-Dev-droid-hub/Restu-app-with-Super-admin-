import { Router } from 'express';
import Joi from 'joi';
import { authenticate, authorize } from '@/middleware/auth';
import { validate } from '@/middleware/validation';
import { DealCampaignController } from './deal-campaign.controller';

const router = Router() as any;
const controller = new DealCampaignController();

const heroBannerSchema = Joi.object({
  imageUrl: Joi.string().max(500).optional().allow('', null),
  title: Joi.string().max(100).optional().allow('', null),
  subtitle: Joi.string().max(200).optional().allow('', null),
  bgColor: Joi.string().max(50).optional().allow('', null),
}).optional();

const createCampaignSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  description: Joi.string().max(2000).optional().allow('', null),
  heroBanner: heroBannerSchema,
  category: Joi.string().max(100).optional().allow('', null),
  categories: Joi.array().items(Joi.string()).optional(),
  startDate: Joi.date().optional().allow(null),
  endDate: Joi.date().optional().allow(null),
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'SCHEDULED').optional(),
  displayOrder: Joi.number().min(0).optional(),
  branch: Joi.string().optional().allow(null),
});

const updateCampaignSchema = Joi.object({
  name: Joi.string().min(2).max(255).optional(),
  description: Joi.string().max(2000).optional().allow('', null),
  heroBanner: heroBannerSchema,
  category: Joi.string().max(100).optional().allow('', null),
  categories: Joi.array().items(Joi.string()).optional(),
  startDate: Joi.date().optional().allow(null),
  endDate: Joi.date().optional().allow(null),
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'SCHEDULED').optional(),
  displayOrder: Joi.number().min(0).optional(),
  branch: Joi.string().optional().allow(null),
});

const dealItemSchema = Joi.object({
  title: Joi.string().min(2).max(255).required(),
  description: Joi.string().max(2000).optional().allow('', null),
  imageUrl: Joi.string().max(500).optional().allow('', null),
  price: Joi.number().min(0).required(),
  originalPrice: Joi.number().min(0).optional().allow(null),
  categories: Joi.array().items(Joi.string()).optional(),
  items: Joi.array()
    .items(
      Joi.object({
        _id: Joi.string().optional().allow('', null),
        productId: Joi.string().optional().allow(null),
        productName: Joi.string().optional().allow('', null),
        quantity: Joi.number().min(1).optional(),
        price: Joi.number().min(0).optional().allow(null),
      })
    )
    .optional(),
  isActive: Joi.boolean().optional(),
  displayOrder: Joi.number().min(0).optional(),
});

const updateDealItemSchema = Joi.object({
  title: Joi.string().min(2).max(255).optional(),
  description: Joi.string().max(2000).optional().allow('', null),
  imageUrl: Joi.string().max(500).optional().allow('', null),
  price: Joi.number().min(0).optional(),
  originalPrice: Joi.number().min(0).optional().allow(null),
  categories: Joi.array().items(Joi.string()).optional(),
  items: Joi.array()
    .items(
      Joi.object({
        _id: Joi.string().optional().allow('', null),
        productId: Joi.string().optional().allow(null),
        productName: Joi.string().optional().allow('', null),
        quantity: Joi.number().min(1).optional(),
        price: Joi.number().min(0).optional().allow(null),
      })
    )
    .optional(),
  isActive: Joi.boolean().optional(),
  displayOrder: Joi.number().min(0).optional(),
  discount: Joi.number().min(0).max(100).optional().allow(null),
});

// Public
router.get('/campaigns/active', controller.getActiveCampaigns.bind(controller));
router.get('/campaigns/:id', controller.getCampaignById.bind(controller));

// Staff (admin/super-admin/branch-manager)
router.get('/campaigns', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'), controller.getCampaigns.bind(controller));
router.post(
  '/campaigns',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'),
  validate(createCampaignSchema),
  controller.createCampaign.bind(controller)
);
router.patch(
  '/campaigns/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'),
  validate(updateCampaignSchema),
  controller.updateCampaign.bind(controller)
);
router.delete(
  '/campaigns/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'),
  controller.deleteCampaign.bind(controller)
);

// Deal items within a campaign
router.post(
  '/campaigns/:id/deals',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'),
  validate(dealItemSchema),
  controller.addDealItem.bind(controller)
);
router.patch(
  '/campaigns/:id/deals/:dealId',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'),
  validate(updateDealItemSchema),
  controller.updateDealItem.bind(controller)
);
router.delete(
  '/campaigns/:id/deals/:dealId',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'),
  controller.deleteDealItem.bind(controller)
);
router.patch(
  '/campaigns/:id/deals/:dealId/toggle',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'),
  controller.toggleDealItem.bind(controller)
);

export default router;
