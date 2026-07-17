import { Schema, model, Types } from 'mongoose';
import type { Document } from 'mongoose';

export type MessageSender = 'user' | 'assistant';

export interface IMessage {
  sender: MessageSender;
  content: string;
  references?: string[];
  createdAt: Date;
}

export interface IConversation extends Document {
  userId: Types.ObjectId;
  sessionId: string;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    sender: {
      type: String,
      enum: ['user', 'assistant'],
      required: [true, 'Message sender must be either user or assistant.'],
    },
    content: {
      type: String,
      required: [true, 'Message content is required.'],
      trim: true,
    },
    references: {
      type: [String],
      required: false,
    },
    createdAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  { _id: false }
);

const ConversationSchema = new Schema<IConversation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required.'],
      index: true,
    },
    sessionId: {
      type: String,
      required: [true, 'Session identifier string is required.'],
      index: true,
      trim: true,
    },
    messages: {
      type: [MessageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const Conversation = model<IConversation>('Conversation', ConversationSchema);
export default Conversation;
