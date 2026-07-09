import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { DealCampaign } from '@/models/DealCampaign';
import { IAuthRequest } from '@/types';
import {
  assertBranchBelongsToTenant,
  getTenantBranchIds,
  getTenantIdFromRequest,
} from '@/utils/tenantScope';

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

function normalizeBranchIds(value: unknown): mongoose.Types.ObjectId[] {
  const rawBranchIds = Array.isArray(value) ? value : value ? [value] : [];
  return rawBranchIds
    .filter((branchId): branchId is string => typeof branchId === 'string' && mongoose.Types.ObjectId.isValid(branchId))
    .map((branchId) => new mongoose.Types.ObjectId(branchId));
}

function hasBranchAccess(campaign: any, branchId: string | null): boolean {
  if (!branchId) {
    return false;
  }

  const assignedBranches = Array.isArray(campaign?.branch) ? campaign.branch : [];
  return assignedBranches.some((assignedBranch: any) => assignedBranch?.toString() === branchId.toString());
}

function getDisplayOrder(value: unknown): number {
  return Number.isFinite(Number(value)) ? Number(value) : Number.MAX_SAFE_INTEGER;
}

function sortDealsByDisplayOrder<T extends { displayOrder?: number; title?: string }>(deals: T[] = []): T[] {
  return [...deals].sort((a, b) => {
    const displayOrderDifference = getDisplayOrder(a?.displayOrder) - getDisplayOrder(b?.displayOrder);
    if (displayOrderDifference !== 0) {
      return displayOrderDifference;
    }

    return String(a?.title || '').localeCompare(String(b?.title || ''));
  });
}

function emitDealCampaignInvalidate(): void {
  try {
    const io = (globalThis as { ws?: { io?: import('socket.io').Server } }).ws?.io;
    if (!io) return;
    const patch = { timestamp: new Date().toISOString() };
    io.emit('customer_home:invalidate', patch);
    io.to('admin').emit('admin_deals:invalidate', patch);
  } catch {
    /* non-fatal */
  }
}

function sortCampaignsByDisplayOrder<T extends { displayOrder?: number; name?: string; deals?: any[] }>(campaigns: T[] = []): T[] {
  return [...campaigns]
    .map((campaign) => ({
      ...campaign,
      deals: sortDealsByDisplayOrder(Array.isArray(campaign?.deals) ? campaign.deals : []),
    }))
    .sort((a, b) => {
      const displayOrderDifference = getDisplayOrder(a?.displayOrder) - getDisplayOrder(b?.displayOrder);
      if (displayOrderDifference !== 0) {
        return displayOrderDifference;
      }

      return String(a?.name || '').localeCompare(String(b?.name || ''));
    });
}

async function getTenantCampaignBranchFilter(req: Request): Promise<Record<string, unknown> | null> {
  const tenantId = getTenantIdFromRequest(req as IAuthRequest);
  if (!tenantId) return {};
  const branchIds = await getTenantBranchIds(tenantId);
  if (!branchIds.length) return { branch: { $in: [] } };
  return { branch: { $in: branchIds } };
}

async function assertCampaignTenantAccess(req: Request, campaign: any): Promise<boolean> {
  const tenantId = getTenantIdFromRequest(req as IAuthRequest);
  if (!tenantId) return true;
  const branches = Array.isArray(campaign?.branch) ? campaign.branch : [];
  if (!branches.length) return false;
  for (const branch of branches) {
    const branchId = String(branch?._id || branch);
    if (await assertBranchBelongsToTenant(tenantId, branchId)) return true;
  }
  return false;
}

async function normalizeCampaignBranchesForTenant(
  req: Request,
  branch: mongoose.Types.ObjectId[]
): Promise<mongoose.Types.ObjectId[]> {
  const tenantId = getTenantIdFromRequest(req as IAuthRequest);
  if (!tenantId) return branch;
  const allowed: mongoose.Types.ObjectId[] = [];
  for (const branchId of branch) {
    if (await assertBranchBelongsToTenant(tenantId, String(branchId))) {
      allowed.push(branchId);
    }
  }
  return allowed;
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
      let branch: mongoose.Types.ObjectId[] = [];
      if (role === 'BRANCH_MANAGER') {
        if (!userBranchId) {
          return res.status(400).json({ success: false, message: 'Branch manager branch is missing' });
        }
        branch = [new mongoose.Types.ObjectId(userBranchId)];
      } else {
        branch = normalizeBranchIds(req.body?.branch);
      }

      branch = await normalizeCampaignBranchesForTenant(req, branch);
      if (getTenantIdFromRequest(req as IAuthRequest) && !branch.length) {
        return res.status(403).json({ success: false, message: 'Branch must belong to your restaurant.' });
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

      emitDealCampaignInvalidate();
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
      const queryBranchId = req.query.branchId as string;

      const filter: any = { deletedAt: null };
      const tenantBranchFilter = await getTenantCampaignBranchFilter(req);
      Object.assign(filter, tenantBranchFilter);

      // Branch scoping:
      // - BRANCH_MANAGER sees only their branch campaigns
      // - ADMIN/SUPER_ADMIN sees all, but can filter by query parameter
      if (role === 'BRANCH_MANAGER') {
        if (!userBranchId) {
          return res.status(400).json({ success: false, message: 'Branch manager branch is missing' });
        }
        const branchKey = String(userBranchId);
        const branchCandidates: (mongoose.Types.ObjectId | string)[] = [branchKey];
        if (mongoose.Types.ObjectId.isValid(branchKey)) {
          branchCandidates.unshift(new mongoose.Types.ObjectId(branchKey));
        }
        filter.branch = { $in: branchCandidates };
      } else if (queryBranchId) {
        if (queryBranchId === 'global') {
          filter.branch = { $size: 0 };
        } else if (queryBranchId !== 'all') {
          const tenantId = getTenantIdFromRequest(req as IAuthRequest);
          if (tenantId) {
            const allowed = await assertBranchBelongsToTenant(tenantId, queryBranchId);
            if (!allowed) {
              return res.status(200).json({ success: true, data: { campaigns: [] } });
            }
          }
          filter.branch = { $in: [new mongoose.Types.ObjectId(queryBranchId)] };
        }
      }

      const campaigns = sortCampaignsByDisplayOrder(await DealCampaign.find(filter)
        .populate('branch', 'branchName branchCode')
        .sort({ displayOrder: 1, createdAt: -1 })
        .lean());

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

      // For public access (no branch specified), show only global campaigns (branch: null)
      // For branch-specific, ONLY show campaigns specifically assigned to that branch
      // Must EXCLUDE global campaigns (branch: null) when a branch is selected
      if (branchId) {
        // Only show campaigns specifically assigned to this branch
        // Do NOT show global campaigns (branch: null) when a specific branch is selected
        filter.branch = { $in: [new mongoose.Types.ObjectId(branchId)] };
      } else {
        // No branch specified - only show global campaigns (no branch assigned)
        filter.branch = { $size: 0 };
      }

      const campaigns = sortCampaignsByDisplayOrder(await DealCampaign.find(filter)
        .populate('branch', 'branchName branchCode')
        .sort({ displayOrder: 1, createdAt: -1 })
        .lean());

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
      if (!(await assertCampaignTenantAccess(req, campaign))) {
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
      if (!(await assertCampaignTenantAccess(req, existing))) {
        return res.status(404).json({ success: false, message: 'Campaign not found' });
      }

      if (role === 'BRANCH_MANAGER') {
        if (!userBranchId) {
          return res.status(400).json({ success: false, message: 'Branch manager branch is missing' });
        }
        if (!hasBranchAccess(existing, userBranchId)) {
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
      if (Array.isArray(req.body?.branch) || typeof req.body?.branch === 'string') {
        update.branch = role === 'BRANCH_MANAGER'
          ? userBranchId
            ? [new mongoose.Types.ObjectId(userBranchId)]
            : []
          : normalizeBranchIds(req.body.branch);
      }
      if (role === 'BRANCH_MANAGER') {
        delete update.branch;
      }

      const campaign = await DealCampaign.findByIdAndUpdate(req.params.id, update, {
        new: true,
        runValidators: true,
      }).lean();

      emitDealCampaignInvalidate();
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
      if (!(await assertCampaignTenantAccess(req, existing))) {
        return res.status(404).json({ success: false, message: 'Campaign not found' });
      }

      if (role === 'BRANCH_MANAGER') {
        if (!userBranchId) {
          return res.status(400).json({ success: false, message: 'Branch manager branch is missing' });
        }
        if (!hasBranchAccess(existing, userBranchId)) {
          return res.status(403).json({ success: false, message: 'Not allowed to delete this campaign' });
        }
      }

      await DealCampaign.findByIdAndUpdate(req.params.id, {
        deletedAt: new Date(),
        status: 'INACTIVE',
        updatedBy: user?._id || null,
      });

      emitDealCampaignInvalidate();
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
      if (!(await assertCampaignTenantAccess(req, campaign))) {
        return res.status(404).json({ success: false, message: 'Campaign not found' });
      }

      if (role === 'BRANCH_MANAGER') {
        if (!userBranchId) {
          return res.status(400).json({ success: false, message: 'Branch manager branch is missing' });
        }
        if (!hasBranchAccess(campaign, userBranchId)) {
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

      emitDealCampaignInvalidate();
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
      if (!(await assertCampaignTenantAccess(req, campaign))) {
        return res.status(404).json({ success: false, message: 'Campaign not found' });
      }

      if (role === 'BRANCH_MANAGER') {
        if (!userBranchId) {
          return res.status(400).json({ success: false, message: 'Branch manager branch is missing' });
        }
        if (!hasBranchAccess(campaign, userBranchId)) {
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

      emitDealCampaignInvalidate();
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
      if (!(await assertCampaignTenantAccess(req, campaign))) {
        return res.status(404).json({ success: false, message: 'Campaign not found' });
      }

      if (role === 'BRANCH_MANAGER') {
        if (!userBranchId) {
          return res.status(400).json({ success: false, message: 'Branch manager branch is missing' });
        }
        if (!hasBranchAccess(campaign, userBranchId)) {
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

      emitDealCampaignInvalidate();
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
      if (!(await assertCampaignTenantAccess(req, campaign))) {
        return res.status(404).json({ success: false, message: 'Campaign not found' });
      }

      if (role === 'BRANCH_MANAGER') {
        if (!userBranchId) {
          return res.status(400).json({ success: false, message: 'Branch manager branch is missing' });
        }
        if (!hasBranchAccess(campaign, userBranchId)) {
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

      emitDealCampaignInvalidate();
      return res.status(200).json({ success: true, data: { deal } });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: 'Failed to toggle deal item', error: error.message });
    }
  }
}
