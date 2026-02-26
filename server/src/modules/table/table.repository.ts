import { RestaurantTable } from '@/models/RestaurantTable';

export class TableRepository {
  // Find all tables with optional filters
  async findAll(filters: any = {}) {
    return RestaurantTable.find(filters)
      .populate('branch', 'branchName branchCode')
      .populate('currentWaiter', 'displayName email')
      .sort({ floorNumber: 1, section: 1, tableNumber: 1 });
  }

  // Find table by ID
  async findById(id: string) {
    return RestaurantTable.findById(id)
      .populate('branch', 'branchName branchCode')
      .populate('currentWaiter', 'displayName email');
  }

  // Find tables by branch
  async findByBranch(branchId: string) {
    return RestaurantTable.findByBranch(branchId);
  }

  // Create new table
  async create(data: any) {
    const table = new RestaurantTable(data);
    return table.save();
  }

  // Update table
  async update(id: string, data: any) {
    return RestaurantTable.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    )
      .populate('branch', 'branchName branchCode')
      .populate('currentWaiter', 'displayName email');
  }

  // Soft delete table
  async softDelete(id: string) {
    const table = await RestaurantTable.findById(id);
    if (!table) return null;
    return table.softDelete();
  }

  // Assign waiter to table
  async assignWaiter(tableId: string, waiterId: string) {
    const table = await RestaurantTable.findById(tableId);
    if (!table) return null;
    return table.assignWaiter(waiterId);
  }

  // Remove waiter from table
  async removeWaiter(tableId: string) {
    const table = await RestaurantTable.findById(tableId);
    if (!table) return null;
    table.currentWaiter = null;
    return table.save();
  }

  // Change table status
  async changeStatus(tableId: string, status: string, waiterId?: string) {
    const table = await RestaurantTable.findById(tableId);
    if (!table) return null;
    return table.changeStatus(status, waiterId);
  }

  // Get table statistics for a branch
  async getStats(branchId: string) {
    return RestaurantTable.getTableStats(branchId);
  }
}
