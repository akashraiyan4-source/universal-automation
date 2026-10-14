import { db, supabase } from '../config/database';

export class BaseService {
  protected db = db || supabase;
  protected supabase = db || supabase;

  protected async handleQuery<T>(
    queryPromise: Promise<{ data: T | null; error: any }>,
    allowNull = false
  ): Promise<T> {
    const { data, error } = await queryPromise;

    if (error) {
      console.error('🔥 [BaseService Database Error]:', error);
      throw new Error(`Database Error: ${error.message || 'Unknown database error'}`);
    }

    if (!data && !allowNull) {
      throw new Error('Requested resource not found');
    }

    return data as T;
  }
}