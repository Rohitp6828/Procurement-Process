import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default Supabase configuration from environment or fallback project
export const DEFAULT_SUPABASE_URL = 'https://fzcoetqhebjuhzvrefcc.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_Ym9tvaFd95H8QwkNPFPl7w_W6YrRLyz';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check user-configured override in localStorage for quick testing/switching
const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('civprocure_supabase_url') : null;
const storedKey = typeof window !== 'undefined' ? localStorage.getItem('civprocure_supabase_key') : null;

export const supabaseUrl = storedUrl || envUrl || DEFAULT_SUPABASE_URL;
export const supabaseAnonKey = storedKey || envAnonKey || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project')
);

// Supabase client instance
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : (null as unknown as SupabaseClient);

export interface TableStatus {
  tableName: string;
  exists: boolean;
  count: number;
  message?: string;
}

export const MASTER_TABLES = [
  'projects',
  'sites',
  'vendors',
  'items',
  'cost_codes',
  'terms',
  'approval_matrix',
] as const;

export type MasterTableName = typeof MASTER_TABLES[number];

/**
 * Test connectivity to a specific table in Supabase
 */
export async function checkTableStatus(tableName: string): Promise<TableStatus> {
  if (!isSupabaseConfigured || !supabase) {
    return { tableName, exists: false, count: 0, message: 'Supabase credentials not configured' };
  }

  try {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: false })
      .limit(1);

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return { tableName, exists: false, count: 0, message: 'Table not found in schema (Run migrations in Supabase SQL editor)' };
      }
      return { tableName, exists: false, count: 0, message: error.message };
    }

    return { tableName, exists: true, count: count ?? (data ? data.length : 0), message: 'Connected & Synced' };
  } catch (err: any) {
    return { tableName, exists: false, count: 0, message: err.message || 'Query failed' };
  }
}

/**
 * Check the status of all master data tables at once
 */
export async function checkAllMasterTables(): Promise<Record<MasterTableName, TableStatus>> {
  const results = {} as Record<MasterTableName, TableStatus>;
  await Promise.all(
    MASTER_TABLES.map(async (table) => {
      results[table] = await checkTableStatus(table);
    })
  );
  return results;
}

/**
 * Subscribe to realtime changes on a master table
 */
export function subscribeToMasterTable(tableName: string, callback: () => void): () => void {
  if (!isSupabaseConfigured || !supabase) {
    return () => {};
  }

  try {
    const channel = supabase
      .channel(`realtime_${tableName}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        () => {
          callback();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn(`Failed to subscribe to ${tableName} realtime updates:`, err);
    return () => {};
  }
}

/**
 * General connection test for Supabase
 */
export async function testSupabaseConnection(
  urlToTest?: string, 
  keyToTest?: string
): Promise<{ success: boolean; message: string; tablesStatus?: Record<string, boolean> }> {
  const url = urlToTest || supabaseUrl;
  const key = keyToTest || supabaseAnonKey;

  if (!url || !key) {
    return { success: false, message: 'Supabase URL and Anon Key must be specified.' };
  }

  try {
    const testClient = createClient(url, key);
    // Probe the connection
    const { error } = await testClient.from('projects').select('count', { count: 'exact', head: true });
    
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return { 
          success: true, 
          message: 'Connected to live Supabase project! (Master tables need to be created with the SQL migration script).' 
        };
      }
      return { success: false, message: error.message };
    }
    
    return { success: true, message: 'Successfully connected to live Supabase PostgreSQL database!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to connect to Supabase' };
  }
}
