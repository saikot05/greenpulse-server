import { Schema, model, Types } from 'mongoose';
import type { Document } from 'mongoose';

export type NotificationType = 'alert' | 'insight' | 'system';

export interface INotification extends Document {
  userId: Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Target User reference is required.'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required.'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification description message is required.'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['alert', 'insight', 'system'],
      required: [true, 'Notification type must be alert, insight, or system.'],
    },
    isRead: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Notification = model<INotification>('Notification', NotificationSchema);
export default Notification;
