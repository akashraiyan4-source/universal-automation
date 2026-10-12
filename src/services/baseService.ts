import { supabase } from '@/src/config/database';

export class BaseService {
  protected db = supabase;
  protected async handleQuery<T>(queryPromise: Promise<{ data: T | null; error: any }>): Promise<T> {
    const { data, error } = await queryPromise;
    if (error) {
      throw new Error(`Database Error: ${error.message}`);
    }
    if (!data) {
      throw new Error('Requested resource not found');
    }
    return data;
  }
}