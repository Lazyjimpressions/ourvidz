
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type Character = Database['public']['Tables']['characters']['Row'];
export type CharacterInsert = Database['public']['Tables']['characters']['Insert'];
export type CharacterUpdate = Database['public']['Tables']['characters']['Update'];

export type Project = Database['public']['Tables']['projects']['Row'];
export type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
export type ProjectUpdate = Database['public']['Tables']['projects']['Update'];

export type Video = Database['public']['Tables']['videos']['Row'];
export type VideoInsert = Database['public']['Tables']['videos']['Insert'];
export type VideoUpdate = Database['public']['Tables']['videos']['Update'];

export type Scene = Database['public']['Tables']['scenes']['Row'];
export type SceneInsert = Database['public']['Tables']['scenes']['Insert'];
export type SceneUpdate = Database['public']['Tables']['scenes']['Update'];

export type Job = Database['public']['Tables']['jobs']['Row'];
export type JobInsert = Database['public']['Tables']['jobs']['Insert'];
export type JobUpdate = Database['public']['Tables']['jobs']['Update'];

export type UsageLog = Database['public']['Tables']['usage_logs']['Row'];
export type UsageLogInsert = Database['public']['Tables']['usage_logs']['Insert'];

// Character operations
export const characterAPI = {
  async getAll() {
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async create(character: CharacterInsert) {
    const { data, error } = await supabase
      .from('characters')
      .insert(character)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: CharacterUpdate) {
    const { data, error } = await supabase
      .from('characters')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Project operations
export const projectAPI = {
  async getAll() {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        character:characters(*),
        scenes(*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        character:characters(*),
        scenes(*),
        videos(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(project: ProjectInsert) {
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: ProjectUpdate) {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Scene operations
export const sceneAPI = {
  async getByProject(projectId: string) {
    const { data, error } = await supabase
      .from('scenes')
      .select('*')
      .eq('project_id', projectId)
      .order('scene_number');
    
    if (error) throw error;
    return data;
  },

  async createBatch(scenes: SceneInsert[]) {
    const { data, error } = await supabase
      .from('scenes')
      .insert(scenes)
      .select();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: SceneUpdate) {
    const { data, error } = await supabase
      .from('scenes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

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

// Usage tracking - fixed to include user_id
export const usageAPI = {
  async logAction(action: string, creditsConsumed: number = 1, metadata?: any) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to log usage');
    }

    const { error } = await supabase
      .from('usage_logs')
      .insert({
        user_id: user.id,
        action,
        credits_consumed: creditsConsumed,
        metadata
      });
    
    if (error) throw error;
  }
};
