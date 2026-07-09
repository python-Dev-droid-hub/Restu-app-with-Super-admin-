import mongoose, { Schema } from 'mongoose';

const supportTicketSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'SaasTenant', required: true, index: true },
    raisedBy: { type: Schema.Types.ObjectId },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, trim: true },
    priority: {
      type: String,
      enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
      default: 'NORMAL',
    },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'WAITING_REPLY', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'SuperAdmin' },
    resolvedAt: { type: Date },
    resolutionNotes: { type: String },
    /** Set when tenant admins were notified of resolution/closure */
    tenantNotifiedAt: { type: Date },
  },
  { timestamps: true }
);

export const SupportTicket = mongoose.model(
  'SaasSupportTicket',
  supportTicketSchema,
  'saas_support_tickets'
);
