 import { useQuery } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 
 export interface PlaygroundModel {
   id: string;
   display_name: string;
   model_key: string;
   modality: 'image' | 'video' | 'chat';
   tasks: string[];
   model_family: string | null;
   is_default: boolean;
   provider_name: string;
   provider_display_name: string;
 }
 
 export interface PromptTemplate {
   id: string;
   template_name: string;
   use_case: string;
   target_model: string | null;
   content_mode: string;
   description: string | null;
 }
 
 export const usePlaygroundModels = () => {
   return useQuery({
     queryKey: ['playground-models'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('api_models')
         .select(`
           id,
           display_name,
           model_key,
           modality,
            tasks,
           model_family,
           is_default,
           api_providers!inner(name, display_name)
         `)
         .eq('is_active', true)
         .order('modality')
         .order('priority', { ascending: false });
 
       if (error) throw error;
 
       return (data || []).map((m: any) => ({
         id: m.id,
         display_name: m.display_name,
         model_key: m.model_key,
         modality: m.modality,
         tasks: m.tasks,
         model_family: m.model_family,
         is_default: m.is_default,
         provider_name: m.api_providers.name,
         provider_display_name: m.api_providers.display_name,
       })) as PlaygroundModel[];
     },
     staleTime: 5 * 60 * 1000,
   });
 };
 
 export const usePlaygroundTemplates = (useCase?: string) => {
   return useQuery({
     queryKey: ['playground-templates', useCase],
     queryFn: async () => {
       let query = supabase
         .from('prompt_templates')
         .select('id, template_name, use_case, target_model, content_mode, description')
         .eq('is_active', true);
 
       if (useCase) {
         query = query.eq('use_case', useCase);
       }
 
       const { data, error } = await query
         .order('use_case')
         .order('template_name');
 
       if (error) throw error;
       return (data || []) as PromptTemplate[];
     },
     staleTime: 5 * 60 * 1000,
   });
 };
 
 // Helper to group models by type
 export const useGroupedModels = () => {
   const { data: models, isLoading, error } = usePlaygroundModels();
 
   const grouped = {
      chat: models?.filter(m => m.modality === 'chat' && !m.tasks?.includes('enhancement')) || [],
      image: models?.filter(m => m.tasks?.includes('t2i')) || [],
      video: models?.filter(m => m.modality === 'video') || [],
      i2i: models?.filter(m => m.tasks?.includes('i2i')) || [],
      enhancement: models?.filter(m => m.modality === 'chat' && m.tasks?.includes('enhancement')) || [],
   };
 
   return { grouped, isLoading, error };
 };