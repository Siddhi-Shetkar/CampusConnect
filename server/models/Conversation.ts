import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IConversationDocument extends Document {
  participants: Types.ObjectId[];
  participantKey: string;
  connectionRequest: Types.ObjectId | null;
  lastMessageText: string;
  lastMessageSender: Types.ObjectId | null;
  lastMessageAt: Date;
  createdAt: Date;
}

const ConversationSchema = new Schema<IConversationDocument>(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    participantKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    connectionRequest: {
      type: Schema.Types.ObjectId,
      ref: 'ConnectionRequest',
      default: null,
    },
    lastMessageText: {
      type: String,
      default: '',
      maxlength: 200,
    },
    lastMessageSender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

ConversationSchema.index({ participants: 1 });

export const ConversationModel =
  mongoose.models.Conversation ||
  mongoose.model<IConversationDocument>('Conversation', ConversationSchema);
