
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type Project = Database['public']['Tables']['projects']['Row'];
export type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
export type ProjectUpdate = Database['public']['Tables']['projects']['Update'];

export type Video = Database['public']['Tables']['videos']['Row'];
export type VideoInsert = Database['public']['Tables']['videos']['Insert'];
export type VideoUpdate = Database['public']['Tables']['videos']['Update'];

export type Job = Database['public']['Tables']['jobs']['Row'];
export type JobInsert = Database['public']['Tables']['jobs']['Insert'];
export type JobUpdate = Database['public']['Tables']['jobs']['Update'];

export type UsageLog = Database['public']['Tables']['usage_logs']['Row'];
export type UsageLogInsert = Database['public']['Tables']['usage_logs']['Insert'];

export type Image = Database['public']['Tables']['images']['Row'];
export type ImageInsert = Database['public']['Tables']['images']['Insert'];
export type ImageUpdate = Database['public']['Tables']['images']['Update'];

// Video operations
export const videoAPI = {
  async getByUser() {
    const { data, error } = await supabase
      .from('videos')
      .select(`
        *,
        project:projects(title, original_prompt)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async create(video: VideoInsert) {
    const { data, error } = await supabase
      .from('videos')
      .insert(video)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: string, additionalUpdates?: VideoUpdate) {
    const updates = { status, ...additionalUpdates };
    const { data, error } = await supabase
      .from('videos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Image operations
export const imageAPI = {
  async getAll() {
    const { data, error } = await supabase
      .from('images')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getByMode(mode: string) {
    const { data, error } = await supabase
      .from('images')
      .select('*')
      .eq('generation_mode', mode)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async create(image: ImageInsert) {
    const { data, error } = await supabase
      .from('images')
      .insert(image)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: ImageUpdate) {
    const { data, error } = await supabase
      .from('images')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: string, additionalUpdates?: ImageUpdate) {
    const updates = { status, ...additionalUpdates };
    const { data, error } = await supabase
      .from('images')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('images')
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
