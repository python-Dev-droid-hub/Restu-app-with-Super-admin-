import mongoose, { Schema } from 'mongoose';

const ticketMessageSchema = new Schema(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: 'SaasSupportTicket', required: true, index: true },
    authorId: { type: Schema.Types.ObjectId },
    authorType: {
      type: String,
      enum: ['SUPER_ADMIN', 'TENANT', 'SYSTEM'],
      default: 'SUPER_ADMIN',
    },
    authorName: { type: String, trim: true },
    body: { type: String, required: true },
    isInternal: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const SupportTicketMessage = mongoose.model(
  'SaasSupportTicketMessage',
  ticketMessageSchema,
  'saas_support_ticket_messages'
);
