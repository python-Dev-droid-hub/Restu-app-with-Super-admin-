import net from 'net';
import { logger } from '@/utils/logger';
import { Printer } from '@/models/Printer';
import { PrintJob } from '@/models/PrintJob';
import { formatBillText, type BillOrder } from '@/services/billFormatter';
import { Types } from 'mongoose';

const printQueue: Array<() => Promise<void>> = [];
let queueRunning = false;

async function runQueue() {
  if (queueRunning) return;
  queueRunning = true;
  while (printQueue.length > 0) {
    const job = printQueue.shift();
    if (!job) break;
    try {
      await job();
    } catch (e) {
      logger.error('[printer] queue job failed', e);
    }
  }
  queueRunning = false;
}

function enqueue(task: () => Promise<void>) {
  printQueue.push(task);
  void runQueue();
}

/** ESC/POS init + text + feed + partial cut */
function buildEscPosBuffer(text: string): Buffer {
  const chunks: Buffer[] = [
    Buffer.from([0x1b, 0x40]),
    Buffer.from(text, 'utf8'),
    Buffer.from('\n\n\n'),
    Buffer.from([0x1d, 0x56, 0x00]),
  ];
  return Buffer.concat(chunks);
}

export function printRawNetwork(
  host: string,
  port: number,
  content: string,
  timeoutMs = 8000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    const timer = setTimeout(() => {
      client.destroy();
      reject(new Error(`Printer timeout (${host}:${port})`));
    }, timeoutMs);

    client.connect(port, host, () => {
      client.write(buildEscPosBuffer(content), () => {
        clearTimeout(timer);
        client.end();
        resolve();
      });
    });

    client.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export async function getActivePrinterForBranch(branchId: string) {
  return Printer.findOne({
    branch: branchId,
    isActive: true,
    deletedAt: null,
  }).sort({ isDefault: -1, createdAt: -1 });
}

export function orderToBillOrder(order: any): BillOrder {
  const items = (order.items || []).map((it: any) => ({
    productName: it.productName || it.product?.name || 'Item',
    quantity: it.quantity || 1,
    unitPrice: it.unitPrice || 0,
    totalPrice: it.totalPrice || it.unitPrice * (it.quantity || 1),
    sizeName: it.sizeName,
  }));

  return {
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    tableNumber: order.table?.tableNumber || order.tableNumber,
    createdAt: order.createdAt,
    items: items.filter((i: any) => i.productName),
    subtotal: order.subtotal ?? order.totalAmount,
    taxAmount: order.taxAmount,
    deliveryFee: order.deliveryFee,
    totalAmount: order.totalAmount,
    finalAmount: order.finalAmount,
    waiterName: order.waiter?.displayName || order.waiterName,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
  };
}

async function executePrintJob(
  printJobId: Types.ObjectId,
  printer: { host: string; port: number },
  content: string,
  retries = 3
) {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await printRawNetwork(printer.host, printer.port, content);
      await PrintJob.findByIdAndUpdate(printJobId, {
        status: 'COMPLETED',
        completedAt: new Date(),
        attempts: attempt,
        lastError: null,
      });
      return;
    } catch (err: any) {
      lastError = err;
      await PrintJob.findByIdAndUpdate(printJobId, {
        status: attempt < retries ? 'RETRYING' : 'FAILED',
        attempts: attempt,
        lastError: err?.message || String(err),
      });
    }
  }
  throw lastError || new Error('Print failed');
}

export async function queueBillPrint(options: {
  order: any;
  branchId: string;
  requestedBy: string;
  restaurantName?: string;
  branchName?: string;
}) {
  const { order, branchId, requestedBy } = options;
  const printer = await getActivePrinterForBranch(branchId);

  if (!printer) {
    throw new Error('No active printer configured for this branch');
  }

  const bill = orderToBillOrder(order);
  const content = formatBillText(bill, {
    restaurantName: options.restaurantName || 'Restaurant',
    branchName: options.branchName || order.branch?.branchName || 'Branch',
  });

  const job = await PrintJob.create({
    order: order._id,
    branch: branchId,
    printer: printer._id,
    status: 'PENDING',
    requestedBy,
    contentPreview: content.slice(0, 500),
  });

  enqueue(async () => {
    try {
      await executePrintJob(job._id, { host: printer.host, port: printer.port }, content);
      logger.info(`[printer] Bill printed order=${order.orderNumber} job=${job._id}`);
    } catch (e) {
      logger.error(`[printer] Bill print failed order=${order.orderNumber}`, e);
    }
  });

  return job;
}

export async function testPrinter(printerId: string) {
  const printer = await Printer.findById(printerId);
  if (!printer) throw new Error('Printer not found');
  const content = formatBillText(
    {
      orderNumber: 'TEST-001',
      tableNumber: '1',
      items: [{ productName: 'Test Item', quantity: 1, unitPrice: 10, totalPrice: 10 }],
      subtotal: 10,
      finalAmount: 10,
    },
    { restaurantName: 'Test', branchName: printer.name }
  );
  await printRawNetwork(printer.host, printer.port, content);
  return true;
}
