import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IPushSubscriptionDocument extends Document {
  user: Types.ObjectId;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent: string;
  createdAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscriptionDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 1000,
    },
    keys: {
      p256dh: { type: String, required: true, trim: true, maxlength: 300 },
      auth: { type: String, required: true, trim: true, maxlength: 300 },
    },
    userAgent: {
      type: String,
      default: '',
      maxlength: 250,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

export const PushSubscriptionModel =
  mongoose.models.PushSubscription ||
  mongoose.model<IPushSubscriptionDocument>('PushSubscription', PushSubscriptionSchema);
