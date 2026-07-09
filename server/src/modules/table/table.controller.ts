import { Request, Response } from 'express';
import { TableRepository } from './table.repository';
import { IAuthRequest } from '@/types';
import {
  assertBranchBelongsToTenant,
  getTenantIdFromRequest,
  tenantTableBranchFilter,
} from '@/utils/tenantScope';

export class TableController {
  private tableRepository: TableRepository;

  constructor() {
    this.tableRepository = new TableRepository();
  }

  private async resolveTableFilters(req: IAuthRequest, branchQuery?: string): Promise<Record<string, unknown> | null> {
    const userRole = req.user?.role;
    const userBranch = req.user?.assignedBranch as any;
    const assignedBranchId = userBranch?._id?.toString() || userBranch?.toString?.() || '';
    const isBranchScopedRole = userRole === 'BRANCH_MANAGER' || userRole === 'WAITER' || userRole === 'CHEF';
    const tenantId = getTenantIdFromRequest(req);

    if (isBranchScopedRole) {
      if (!assignedBranchId) return null;
      const allowed = await assertBranchBelongsToTenant(tenantId, assignedBranchId);
      return allowed ? { branch: assignedBranchId } : null;
    }

    const tenantBranchScope = await tenantTableBranchFilter(tenantId, branchQuery);
    return tenantBranchScope;
  }

  private async assertTableAccess(req: IAuthRequest, tableId: string): Promise<boolean> {
    const tenantId = getTenantIdFromRequest(req);
    if (!tenantId) return true;

    const table = await this.tableRepository.findById(tableId);
    if (!table) return false;

    const branchId = String((table as any).branch?._id || (table as any).branch || '');
    return assertBranchBelongsToTenant(tenantId, branchId);
  }

  // Get all tables with optional filtering
  getTables = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
      const { branch, status, search } = req.query;
      const branchScope = await this.resolveTableFilters(req, branch ? String(branch) : undefined);

      if (branchScope === null) {
        res.status(403).json({
          success: false,
          message: 'Access denied. Branch is outside your restaurant.',
        });
        return;
      }

      const filters: any = { ...branchScope };

      if (status && status !== 'all') filters.status = status;
      if (search) {
        filters.$or = [
          { tableNumber: { $regex: search, $options: 'i' } },
          { section: { $regex: search, $options: 'i' } },
        ];
      }

      const tables = await this.tableRepository.findAll(filters);

      res.json({
        success: true,
        data: { tables },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch tables',
      });
    }
  };

  // Get tables by branch
  getTablesByBranch = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
      const { branchId } = req.params;
      const branchScope = await this.resolveTableFilters(req, branchId);

      if (branchScope === null) {
        res.status(403).json({
          success: false,
          message: 'Access denied. Branch is outside your restaurant.',
        });
        return;
      }

      const tables = await this.tableRepository.findByBranch(branchId);

      res.json({
        success: true,
        data: { tables },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch tables',
      });
    }
  };

  // Get single table
  getTable = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const allowed = await this.assertTableAccess(req, id);
      if (!allowed) {
        res.status(403).json({
          success: false,
          message: 'Access denied. Table is outside your restaurant.',
        });
        return;
      }

      const table = await this.tableRepository.findById(id);

      if (!table) {
        res.status(404).json({
          success: false,
          message: 'Table not found',
        });
        return;
      }

      res.json({
        success: true,
        data: { table },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch table',
      });
    }
  };

  // Create new table
  createTable = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
      const tableData = req.body;
      const tenantId = getTenantIdFromRequest(req);
      const branchId = String(tableData?.branch || '');

      if (tenantId) {
        const allowed = await assertBranchBelongsToTenant(tenantId, branchId);
        if (!allowed) {
          res.status(403).json({
            success: false,
            message: 'Cannot create table for a branch outside your restaurant.',
          });
          return;
        }
      }

      const table = await this.tableRepository.create(tableData);

      res.status(201).json({
        success: true,
        data: { table },
        message: 'Table created successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create table',
      });
    }
  };

  // Update table
  updateTable = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const allowed = await this.assertTableAccess(req, id);
      if (!allowed) {
        res.status(403).json({
          success: false,
          message: 'Access denied. Table is outside your restaurant.',
        });
        return;
      }

      const table = await this.tableRepository.update(id, updateData);

      if (!table) {
        res.status(404).json({
          success: false,
          message: 'Table not found',
        });
        return;
      }

      res.json({
        success: true,
        data: { table },
        message: 'Table updated successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update table',
      });
    }
  };

  // Delete table (hard delete - permanently removes from database)
  deleteTable = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const allowed = await this.assertTableAccess(req, id);
      if (!allowed) {
        res.status(403).json({
          success: false,
          message: 'Access denied. Table is outside your restaurant.',
        });
        return;
      }

      const table = await this.tableRepository.hardDelete(id);

      if (!table) {
        res.status(404).json({
          success: false,
          message: 'Table not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Table deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete table',
      });
    }
  };

  // Assign waiter to table
  assignWaiter = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { waiterId } = req.body;
      const allowed = await this.assertTableAccess(req, id);
      if (!allowed) {
        res.status(403).json({ success: false, message: 'Access denied.' });
        return;
      }

      const table = await this.tableRepository.assignWaiter(id, waiterId);

      if (!table) {
        res.status(404).json({
          success: false,
          message: 'Table not found',
        });
        return;
      }

      res.json({
        success: true,
        data: { table },
        message: 'Waiter assigned successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to assign waiter',
      });
    }
  };

  // Remove waiter from table
  removeWaiter = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const allowed = await this.assertTableAccess(req, id);
      if (!allowed) {
        res.status(403).json({ success: false, message: 'Access denied.' });
        return;
      }

      const table = await this.tableRepository.removeWaiter(id);

      if (!table) {
        res.status(404).json({
          success: false,
          message: 'Table not found',
        });
        return;
      }

      res.json({
        success: true,
        data: { table },
        message: 'Waiter removed successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to remove waiter',
      });
    }
  };

  // Change table status
  changeStatus = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status, waiterId } = req.body;
      const allowed = await this.assertTableAccess(req, id);
      if (!allowed) {
        res.status(403).json({ success: false, message: 'Access denied.' });
        return;
      }

      const table = await this.tableRepository.changeStatus(id, status, waiterId);

      if (!table) {
        res.status(404).json({
          success: false,
          message: 'Table not found',
        });
        return;
      }

      res.json({
        success: true,
        data: { table },
        message: 'Table status updated successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to change status',
      });
    }
  };

  // Get table statistics
  getTableStats = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
      const { branchId } = req.params;
      const branchScope = await this.resolveTableFilters(req, branchId);

      if (branchScope === null) {
        res.status(403).json({
          success: false,
          message: 'Access denied. Branch is outside your restaurant.',
        });
        return;
      }

      const stats = await this.tableRepository.getStats(branchId);

      res.json({
        success: true,
        data: { stats },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch stats',
      });
    }
  };
}
