import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { DealCampaign } from '@/models/DealCampaign';

const STAFF_ROLES = ['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'];

function getUserBranchId(req: Request): string | null {
  const u: any = (req as any).user;
  return (
    u?.assignedBranch?._id ||
    u?.assignedBranch ||
    u?.branch?._id ||
    u?.branch ||
    u?.branchId ||
    null
  );
}

export class DealCampaignController {
  async createCampaign(req: Request, res: Response) {
    try {
      const user: any = (req as any).user;
      const role = user?.role;
      const userBranchId = getUserBranchId(req);

      // Branch scoping:
      // - BRANCH_MANAGER must create under their branch
      // - ADMIN/SUPER_ADMIN can create branch-specific or global (null)
      let branch: mongoose.Types.ObjectId | null = null;
      if (role === 'BRANCH_MANAGER') {
        if (!userBranchId) {
          return res.status(400).json({ success: false, message: 'Branch manager branch is missing' });
        }
        branch = new mongoose.Types.ObjectId(userBranchId);
      } else {
        // Accept branch from body; null means global
        const branchId = req.body?.branch || null;
        branch = branchId ? new mongoose.Types.ObjectId(branchId) : null;
      }

      const categories = Array.isArray(req.body?.categories)
        ? (req.body.categories
            .filter(Boolean)
            .map((id: string) => new mongoose.Types.ObjectId(id)))
        : [];

      const campaign = await DealCampaign.create({
        name: req.body.name,
        description: req.body.description,
        heroBanner: req.body.heroBanner,
        category: req.body.category,
        categories,
        startDate: req.body.startDate || null,
        endDate: req.body.endDate || null,
        status: req.body.status || 'ACTIVE',
        displayOrder: req.body.displayOrder || 0,
        branch,
        createdBy: user?._id || null,
        updatedBy: user?._id || null,
      });

      return res.status(201).json({ success: true, data: { campaign } });
    } catch (error: any) {
      console.error('[DealCampaign] createCampaign error:', error);
      return res.status(500).json({ success: false, message: 'Failed to create campaign', error: error.message });
    }
  }

  async getCampaigns(req: Request, res: Response) {
    try {
      const user: any = (req as any).user;
      const role = user?.role;
      const userBranchId = getUserBranchId(req);

      const filter: any = { deletedAt: null };

      // Branch scoping:
      // - BRANCH_MANAGER sees only their branch campaigns
      // - ADMIN/SUPER_ADMIN sees all
      if (role === 'BRANCH_MANAGER') {
        if (!userBranchId) {
          return res.status(400).json({ success: false, message: 'Branch manager branch is missing' });
        }
        filter.branch = userBranchId;
      }

      const campaigns = await DealCampaign.find(filter)
        .sort({ displayOrder: 1, createdAt: -1 })
        .lean();

      return res.status(200).json({ success: true, data: { campaigns } });
    } catch (error: any) {
      console.error('[DealCampaign] getCampaigns error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch campaigns', error: error.message });
    }
  }

  async getActiveCampaigns(req: Request, res: Response) {
    try {
      const now = new Date();
      const branchId = (req.query.branch as string) || null;

      console.log('🔥 [getActiveCampaigns] called, branchId:', branchId);

      const filter: any = {
        deletedAt: null,
        status: 'ACTIVE',
        $and: [
          { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
          { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
        ],
      };

      // For public access (no branch specified), show all active campaigns
      // For branch-specific, filter by branch or global (null)
      if (branchId) {
        filter.$or = [{ branch: branchId }, { branch: null }];
      }

      const campaigns = await DealCampaign.find(filter)
        .sort({ displayOrder: 1, createdAt: -1 })
        .lean();

      console.log('🔥 [getActiveCampaigns] found campaigns:', campaigns.length);
      campaigns.forEach((c: any) => {
        console.log('🔥 [getActiveCampaigns] campaign:', c.name, 'deals:', c.deals?.length || 0);
      });

      return res.status(200).json({ success: true, data: { campaigns } });
    } catch (error: any) {
      console.error('[DealCampaign] getActiveCampaigns error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch active campaigns', error: error.message });
    }
  }

  async getCampaignById(req: Request, res: Response) {
    try {
      const campaign = await DealCampaign.findById(req.params.id).lean();
      if (!campaign) {
        return res.status(404).json({ success: false, message: 'Campaign not found' });
      }
      return res.status(200).json({ success: true, data: { campaign } });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: 'Failed to fetch campaign', error: error.message });
    }
  }

  async updateCampaign(req: Request, res: Response) {
    try {
      const user: any = (req as any).user;
      const role = user?.role;
      const userBranchId = getUserBranchId(req);

      const existing: any = await DealCampaign.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Campaign not found' });
      }

      if (role === 'BRANCH_MANAGER') {
        if (!userBranchId) {
          return res.status(400).json({ success: false, message: 'Branch manager branch is missing' });
        }
        if (existing.branch?.toString() !== userBranchId.toString()) {
          return res.status(403).json({ success: false, message: 'Not allowed to update this campaign' });
        }
      }

      // Managers cannot move campaign branch or set global
      const update: any = { ...req.body, updatedBy: user?._id || null, updatedAt: new Date() };
      if (Array.isArray(req.body?.categories)) {
        update.categories = req.body.categories
          .filter(Boolean)
          .map((id: string) => new mongoose.Types.ObjectId(id));
      }
      if (role === 'BRANCH_MANAGER') {
        delete update.branch;
      }

      const campaign = await DealCampaign.findByIdAndUpdate(req.params.id, update, {
        new: true,
        runValidators: true,
      }).lean();

      return res.status(200).json({ success: true, data: { campaign } });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: 'Failed to update campaign', error: error.message });
    }
  }

  async deleteCampaign(req: Request, res: Response) {
    try {
      const user: any = (req as any).user;
      const role = user?.role;
      const userBranchId = getUserBranchId(req);

      const existing: any = await DealCampaign.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Campaign not found' });
      }

      if (role === 'BRANCH_MANAGER') {
        if (!userBranchId) {
          return res.status(400).json({ success: false, message: 'Branch manager branch is missing' });
        }
        if (existing.branch?.toString() !== userBranchId.toString()) {
          return res.status(403).json({ success: false, message: 'Not allowed to delete this campaign' });
        }
      }

      await DealCampaign.findByIdAndUpdate(req.params.id, {
        deletedAt: new Date(),
        status: 'INACTIVE',
        updatedBy: user?._id || null,
      });

      return res.status(200).json({ success: true, message: 'Campaign deleted' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: 'Failed to delete campaign', error: error.message });
    }
  }

  async addDealItem(req: Request, res: Response) {
    try {
      const user: any = (req as any).user;
      const role = user?.role;
      const userBranchId = getUserBranchId(req);

      const campaign: any = await DealCampaign.findById(req.params.id);
      if (!campaign) {
        return res.status(404).json({ success: false, message: 'Campaign not found' });
      }

      if (role === 'BRANCH_MANAGER') {
        if (!userBranchId) {
          return res.status(400).json({ success: false, message: 'Branch manager branch is missing' });
        }
        if (campaign.branch?.toString() !== userBranchId.toString()) {
          return res.status(403).json({ success: false, message: 'Not allowed to modify this campaign' });
        }
      }

      const price = Number(req.body.price);
      const originalPrice = req.body.originalPrice !== undefined ? Number(req.body.originalPrice) : undefined;

      const discount =
        originalPrice && originalPrice > 0
          ? Math.round(((originalPrice - price) / originalPrice) * 100)
          : undefined;

      const categories = Array.isArray(req.body?.categories)
        ? (req.body.categories
            .filter(Boolean)
            .map((id: string) => new mongoose.Types.ObjectId(id)))
        : [];

      const dealItem: any = {
        title: req.body.title,
        description: req.body.description,
        imageUrl: req.body.imageUrl,
        price,
        originalPrice,
        items: req.body.items || [],
        discount,
        isActive: req.body.isActive !== undefined ? !!req.body.isActive : true,
        displayOrder:
          req.body.displayOrder !== undefined
            ? Number(req.body.displayOrder)
            : campaign.deals?.length || 0,
        categories,
      };

      campaign.deals.push(dealItem);
      campaign.updatedBy = user?._id || null;
      await campaign.save();

      const saved = campaign.deals[campaign.deals.length - 1];

      return res.status(201).json({ success: true, data: { deal: saved } });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: 'Failed to add deal item', error: error.message });
    }
  }

  async updateDealItem(req: Request, res: Response) {
    try {
      const user: any = (req as any).user;
      const role = user?.role;
      const userBranchId = getUserBranchId(req);

      const campaign: any = await DealCampaign.findById(req.params.id);
      if (!campaign) {
        return res.status(404).json({ success: false, message: 'Campaign not found' });
      }

      if (role === 'BRANCH_MANAGER') {
        if (!userBranchId) {
          return res.status(400).json({ success: false, message: 'Branch manager branch is missing' });
        }
        if (campaign.branch?.toString() !== userBranchId.toString()) {
          return res.status(403).json({ success: false, message: 'Not allowed to modify this campaign' });
        }
      }

      const deal: any = campaign.deals.id(req.params.dealId);
      if (!deal) {
        return res.status(404).json({ success: false, message: 'Deal item not found' });
      }

      const next: any = { ...req.body };

      if (Array.isArray(req.body?.categories)) {
        next.categories = req.body.categories
          .filter(Boolean)
          .map((id: string) => new mongoose.Types.ObjectId(id));
      }

      if (next.price !== undefined) next.price = Number(next.price);
      if (next.originalPrice !== undefined) next.originalPrice = Number(next.originalPrice);

      const price = next.price !== undefined ? next.price : deal.price;
      const originalPrice = next.originalPrice !== undefined ? next.originalPrice : deal.originalPrice;

      if (originalPrice && originalPrice > 0) {
        next.discount = Math.round(((originalPrice - price) / originalPrice) * 100);
      }

      Object.assign(deal, next);

      campaign.updatedBy = user?._id || null;
      await campaign.save();

      return res.status(200).json({ success: true, data: { deal } });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: 'Failed to update deal item', error: error.message });
    }
  }

  async deleteDealItem(req: Request, res: Response) {
    try {
      const user: any = (req as any).user;
      const role = user?.role;
      const userBranchId = getUserBranchId(req);

      const campaign: any = await DealCampaign.findById(req.params.id);
      if (!campaign) {
        return res.status(404).json({ success: false, message: 'Campaign not found' });
      }

      if (role === 'BRANCH_MANAGER') {
        if (!userBranchId) {
          return res.status(400).json({ success: false, message: 'Branch manager branch is missing' });
        }
        if (campaign.branch?.toString() !== userBranchId.toString()) {
          return res.status(403).json({ success: false, message: 'Not allowed to modify this campaign' });
        }
      }

      const deal: any = campaign.deals.id(req.params.dealId);
      if (!deal) {
        return res.status(404).json({ success: false, message: 'Deal item not found' });
      }

      deal.deleteOne();
      campaign.updatedBy = user?._id || null;
      await campaign.save();

      return res.status(200).json({ success: true, message: 'Deal item deleted' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: 'Failed to delete deal item', error: error.message });
    }
  }

  async toggleDealItem(req: Request, res: Response) {
    try {
      const user: any = (req as any).user;
      const role = user?.role;
      const userBranchId = getUserBranchId(req);

      const campaign: any = await DealCampaign.findById(req.params.id);
      if (!campaign) {
        return res.status(404).json({ success: false, message: 'Campaign not found' });
      }

      if (role === 'BRANCH_MANAGER') {
        if (!userBranchId) {
          return res.status(400).json({ success: false, message: 'Branch manager branch is missing' });
        }
        if (campaign.branch?.toString() !== userBranchId.toString()) {
          return res.status(403).json({ success: false, message: 'Not allowed to modify this campaign' });
        }
      }

      const deal: any = campaign.deals.id(req.params.dealId);
      if (!deal) {
        return res.status(404).json({ success: false, message: 'Deal item not found' });
      }

      deal.isActive = !deal.isActive;
      campaign.updatedBy = user?._id || null;
      await campaign.save();

      return res.status(200).json({ success: true, data: { deal } });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: 'Failed to toggle deal item', error: error.message });
    }
  }
}
