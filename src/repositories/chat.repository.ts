import { BaseRepository } from './base.repository.js';
import { Conversation } from '../models/Conversation.model.js';
import type { IConversation, IMessage } from '../models/Conversation.model.js';
import { AppError } from '../utils/AppError.js';

/**
 * Repository layer for AI Chat Conversation histories.
 * Inherits generic CRUD helper operations from BaseRepository and implements
 * atomic message appenders.
 */
export class ConversationRepository extends BaseRepository<IConversation> {
  constructor() {
    super(Conversation);
  }

  /**
   * Appends a new message to the chat history array.
   * Performs an atomic upsert: creates the document if the session/user combination is new.
   */
  public async appendMessage(sessionId: string, userId: string, message: IMessage): Promise<IConversation> {
    try {
      const updated = await this.model.findOneAndUpdate(
        { sessionId, userId },
        {
          $push: { messages: message },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      ).exec();

      if (!updated) {
        throw new Error('Mongoose write returned empty result.');
      }

      return updated;
    } catch (error) {
      throw new AppError(
        `Database write failed: Unable to append message to session history. Reason: ${(error as Error).message}`,
        500
      );
    }
  }
}
export default ConversationRepository;
