import { Schema, model } from 'mongoose';
import type { Document } from 'mongoose';

export type UserRole = 'admin' | 'facility_manager' | 'auditor';

export interface IUser extends Document {
  name: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
  organization?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'User name is required.'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'User email is required.'],
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'facility_manager', 'auditor'],
      required: [true, 'User role is required.'],
    },
    organization: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const User = model<IUser>('User', UserSchema, 'user');
export default User;
