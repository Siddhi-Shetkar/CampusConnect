import mongoose, { Schema, type Document } from 'mongoose';
import { SKILL_LEVELS, type SkillLevel } from '../../src/types/campus.ts';

export interface IUserDocument extends Document {
  name: string;
  email: string;
  password: string | null;
  college: string;
  year: string;
  bio: string;
  profileImage: string;
  skills: string[];
  interests: string[];
  preferredActivities: string[];
  availability: string;
  skillLevel: SkillLevel;
  isCommunityProfile: boolean;
  createdAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      default: null,
      select: false,
    },
    college: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    year: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    bio: {
      type: String,
      default: '',
      trim: true,
      maxlength: 400,
    },
    profileImage: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    skills: {
      type: [String],
      default: [],
    },
    interests: {
      type: [String],
      default: [],
    },
    preferredActivities: {
      type: [String],
      default: [],
    },
    availability: {
      type: String,
      default: '',
      trim: true,
      maxlength: 80,
    },
    skillLevel: {
      type: String,
      enum: SKILL_LEVELS,
      default: 'Intermediate',
    },
    isCommunityProfile: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

export const UserModel =
  mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);
