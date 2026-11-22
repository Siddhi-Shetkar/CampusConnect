import mongoose, { Schema, type Document, type Types } from 'mongoose';
import type { ConnectionStatus } from '../../src/types/campus.ts';

export interface IConnectionRequestDocument extends Document {
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  partnerRequest: Types.ObjectId;
  message: string;
  status: ConnectionStatus;
  createdAt: Date;
}

const ConnectionRequestSchema = new Schema<IConnectionRequestDocument>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    partnerRequest: {
      type: Schema.Types.ObjectId,
      ref: 'PartnerRequest',
      required: true,
      index: true,
    },
    message: {
      type: String,
      default: '',
      trim: true,
      maxlength: 400,
    },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Rejected'],
      default: 'Pending',
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

ConnectionRequestSchema.index(
  { sender: 1, partnerRequest: 1 },
  { unique: true }
);

export const ConnectionRequestModel =
  mongoose.models.ConnectionRequest ||
  mongoose.model<IConnectionRequestDocument>(
    'ConnectionRequest',
    ConnectionRequestSchema
  );
