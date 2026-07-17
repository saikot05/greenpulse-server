import type { Model, Document, FilterQuery, QueryOptions, UpdateQuery } from 'mongoose';
import { AppError } from '../utils/AppError.js';

/**
 * Abstract Generic Base Repository.
 * Wraps core database operations (CRUD) for any Mongoose Model.
 * Translates low-level MongoDB exceptions into structured, formatted AppErrors.
 */
export abstract class BaseRepository<T extends Document> {
  protected constructor(protected readonly model: Model<T>) {}

  /**
   * Insert a new document.
   */
  public async create(data: Partial<T>): Promise<T> {
    try {
      const entity = new this.model(data);
      return await entity.save();
    } catch (error) {
      throw new AppError(
        `Database operation failed: Unable to create record. Reason: ${(error as Error).message}`,
        500
      );
    }
  }

  /**
   * Query a single document by its ObjectId.
   */
  public async findById(id: string): Promise<T | null> {
    try {
      return await this.model.findById(id).exec();
    } catch (error) {
      throw new AppError(
        `Database operation failed: FindById query failed. Reason: ${(error as Error).message}`,
        500
      );
    }
  }

  /**
   * Query a single document matching custom filters.
   */
  public async findOne(filter: FilterQuery<T>): Promise<T | null> {
    try {
      return await this.model.findOne(filter).exec();
    } catch (error) {
      throw new AppError(
        `Database operation failed: FindOne query failed. Reason: ${(error as Error).message}`,
        500
      );
    }
  }

  /**
   * Query multiple documents matching custom filters.
   */
  public async find(filter: FilterQuery<T>, options?: QueryOptions): Promise<T[]> {
    try {
      return await this.model.find(filter, null, options).exec();
    } catch (error) {
      throw new AppError(
        `Database operation failed: Find query failed. Reason: ${(error as Error).message}`,
        500
      );
    }
  }

  /**
   * Update a document by its ObjectId.
   */
  public async updateById(id: string, data: UpdateQuery<T>): Promise<T | null> {
    try {
      return await this.model.findByIdAndUpdate(id, data, { new: true }).exec();
    } catch (error) {
      throw new AppError(
        `Database operation failed: UpdateById failed. Reason: ${(error as Error).message}`,
        500
      );
    }
  }

  /**
   * Delete a document by its ObjectId.
   */
  public async deleteById(id: string): Promise<T | null> {
    try {
      return await this.model.findByIdAndDelete(id).exec();
    } catch (error) {
      throw new AppError(
        `Database operation failed: DeleteById failed. Reason: ${(error as Error).message}`,
        500
      );
    }
  }

  /**
   * Count documents matching custom filters.
   */
  public async count(filter: FilterQuery<T>): Promise<number> {
    try {
      return await this.model.countDocuments(filter).exec();
    } catch (error) {
      throw new AppError(
        `Database operation failed: Count query failed. Reason: ${(error as Error).message}`,
        500
      );
    }
  }
}
