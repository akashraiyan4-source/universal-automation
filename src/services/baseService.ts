import { db, supabase, withDatabase } from '../config/database';
import { ApiError } from '../middlewares/errorHandler';

export class BaseService {
  protected db = db || supabase;
  protected supabase = db || supabase;

  protected async handleQuery<T>(
    queryPromise: Promise<{ data: T | null; error: any }>,
    allowNull = false
  ): Promise<T> {
    try {
      const { data, error } = await withDatabase(() => queryPromise);

      if (error) {
        console.error('[BaseService] Database error:', error);
        throw new ApiError('The database is temporarily unavailable. Please try again shortly.', 503);
      }

      if (!data && !allowNull) {
        throw new ApiError('Requested resource not found.', 404);
      }

      return data as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('[BaseService] Query failed:', error instanceof Error ? error.message : error);
      throw new ApiError('The database is temporarily unavailable. Please try again shortly.', 503);
    }
  }
}