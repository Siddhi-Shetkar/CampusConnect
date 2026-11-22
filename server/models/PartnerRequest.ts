import mongoose, { Schema, type Document, type Types } from 'mongoose';
import {
  ACTIVITY_CATEGORIES,
  type ActivityCategory,
  REQUEST_FREQUENCIES,
  type RequestFrequency,
  REQUEST_STATUSES,
  type RequestStatus,
  SKILL_LEVELS,
  type SkillLevel,
} from '../../src/types/campus.ts';

export interface IPartnerRequestDocument extends Document {
  creator: Types.ObjectId;
  title: string;
  category: ActivityCategory;
  activity: string;
  description: string;
  skillLevel: SkillLevel;
  availability: string;
  frequency: RequestFrequency;
  college: string;
  peopleNeeded: number;
  status: RequestStatus;
  createdAt: Date;
}

const PartnerRequestSchema = new Schema<IPartnerRequestDocument>(
  {
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 4,
      maxlength: 120,
    },
    category: {
      type: String,
      enum: ACTIVITY_CATEGORIES,
      required: true,
      index: true,
    },
    activity: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 1200,
    },
    skillLevel: {
      type: String,
      enum: SKILL_LEVELS,
      required: true,
    },
    availability: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    frequency: {
      type: String,
      enum: REQUEST_FREQUENCIES,
      required: true,
    },
    college: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    peopleNeeded: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
      default: 1,
    },
    status: {
      type: String,
      enum: REQUEST_STATUSES,
      default: 'Active',
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

export const PartnerRequestModel =
  mongoose.models.PartnerRequest ||
  mongoose.model<IPartnerRequestDocument>('PartnerRequest', PartnerRequestSchema);
