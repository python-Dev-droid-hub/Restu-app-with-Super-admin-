import { Response } from 'express';
import { asyncHandler, sendSuccess } from '@/utils/response';
import { createError } from '@/utils/errorHandler';
import { IAuthRequest } from '@/types';
import { Printer } from '@/models/Printer';
import { PrintJob } from '@/models/PrintJob';
import { testPrinter } from '@/services/printerService';
import { Types } from 'mongoose';

export class PrinterController {
  list = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const branchId = (req.query.branchId as string) || req.user?.assignedBranch;
    const filter: any = { deletedAt: null };
    if (branchId) filter.branch = branchId;
    const printers = await Printer.find(filter).sort({ isDefault: -1, name: 1 });
    sendSuccess(res, { printers }, 'Printers retrieved');
  });

  create = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { branchId, name, host, port, printerType, isDefault } = req.body;
    if (!branchId || !name || !host) {
      throw createError('branchId, name, and host are required', 400);
    }
    if (isDefault) {
      await Printer.updateMany({ branch: branchId }, { isDefault: false });
    }
    const printer = await Printer.create({
      branch: branchId,
      name,
      host,
      port: port || 9100,
      printerType: printerType || 'NETWORK',
      isDefault: !!isDefault,
      isActive: true,
    });
    sendSuccess(res, { printer }, 'Printer created', 201);
  });

  update = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { id } = req.params;
    const updates = req.body;
    if (updates.isDefault) {
      const existing = await Printer.findById(id);
      if (existing) {
        await Printer.updateMany({ branch: existing.branch }, { isDefault: false });
      }
    }
    const printer = await Printer.findByIdAndUpdate(id, updates, { new: true });
    if (!printer) throw createError('Printer not found', 404);
    sendSuccess(res, { printer }, 'Printer updated');
  });

  remove = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const printer = await Printer.findByIdAndUpdate(
      req.params.id,
      { deletedAt: new Date(), isActive: false },
      { new: true }
    );
    if (!printer) throw createError('Printer not found', 404);
    sendSuccess(res, { printer }, 'Printer removed');
  });

  test = asyncHandler(async (req: IAuthRequest, res: Response) => {
    await testPrinter(req.params.id);
    sendSuccess(res, { ok: true }, 'Test print sent');
  });

  status = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const printerId = req.params.id;
    const recent = await PrintJob.find({ printer: printerId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    const failed = recent.filter((j) => j.status === 'FAILED').length;
    sendSuccess(res, {
      printerId,
      recentJobs: recent,
      healthy: failed === 0,
    });
  });

  jobs = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const branchId = req.query.branchId as string;
    const filter: any = {};
    if (branchId && Types.ObjectId.isValid(branchId)) filter.branch = branchId;
    const jobs = await PrintJob.find(filter).sort({ createdAt: -1 }).limit(50).populate('order', 'orderNumber');
    sendSuccess(res, { jobs });
  });
}
