
// Simplified database types using the new schema
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type Project = Database['public']['Tables']['projects']['Row'];
export type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
export type ProjectUpdate = Database['public']['Tables']['projects']['Update'];

export type Job = Database['public']['Tables']['jobs']['Row'];
export type JobInsert = Database['public']['Tables']['jobs']['Insert'];
export type JobUpdate = Database['public']['Tables']['jobs']['Update'];

export type UsageLog = Database['public']['Tables']['usage_logs']['Row'];
export type UsageLogInsert = Database['public']['Tables']['usage_logs']['Insert'];

export type WorkspaceAsset = Database['public']['Tables']['workspace_assets']['Row'];
export type WorkspaceAssetInsert = Database['public']['Tables']['workspace_assets']['Insert'];
export type WorkspaceAssetUpdate = Database['public']['Tables']['workspace_assets']['Update'];

export type UserLibrary = Database['public']['Tables']['user_library']['Row'];
export type UserLibraryInsert = Database['public']['Tables']['user_library']['Insert'];
export type UserLibraryUpdate = Database['public']['Tables']['user_library']['Update'];

// Asset operations using the new simplified schema
export const assetAPI = {
  async getWorkspaceAssets() {
    const { data, error } = await supabase
      .from('workspace_assets')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getUserLibrary() {
    const { data, error } = await supabase
      .from('user_library')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async createWorkspaceAsset(asset: WorkspaceAssetInsert) {
    const { data, error } = await supabase
      .from('workspace_assets')
      .insert(asset)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async moveToLibrary(assetId: string, libraryData: UserLibraryInsert) {
    // Add to library
    const { data, error } = await supabase
      .from('user_library')
      .insert(libraryData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteWorkspaceAsset(id: string) {
    const { error } = await supabase
      .from('workspace_assets')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Usage tracking with decimal credit support
export const usageAPI = {
  async logAction(action: string, creditsConsumed: number = 1, metadata?: any) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to log usage');
    }

    const format = metadata?.format || null;
    const quality = metadata?.quality || null;

    console.log('Logging usage:', { action, creditsConsumed, format, quality, metadata });

    const { error } = await supabase
      .from('usage_logs')
      .insert({
        user_id: user.id,
        action,
        credits_consumed: creditsConsumed,
        format,
        quality,
        metadata
      });
    
    if (error) {
      console.error('Usage logging error:', error);
      throw error;
    }

    console.log('Usage logged successfully');
  },

  async getUsageAnalytics(userId?: string) {
    let query = supabase
      .from('usage_logs')
      .select('action, credits_consumed, format, quality, created_at');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(1000);
    
    if (error) throw error;
    return data;
  }
};
