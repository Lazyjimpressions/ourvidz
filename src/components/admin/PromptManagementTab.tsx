import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PromptTemplatesTable } from './PromptTemplatesTable';
import { NegativePromptsTable } from './NegativePromptsTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';

interface PromptTemplate {
  id: string;
  template_name: string;
  enhancer_model: string;
  use_case: string;
  content_mode: string;
  system_prompt: string;
  token_limit: number;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  metadata?: any;
  job_type?: string;
  target_model?: string;
  description?: string;
  comment?: string;
}

interface NegativePrompt {
  id: string;
  model_type: string;
  content_mode: string;
  negative_prompt: string;
  description?: string;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

interface TestResult {
  id: string;
  prompt_text: string;
  test_tier: 'artistic' | 'explicit' | 'unrestricted';
  test_series: string;
  model_type: 'SDXL' | 'WAN' | 'LORA';
  overall_quality: number;
  technical_quality: number;
  content_quality: number;
  consistency: number;
  notes: string;
  created_at: string;
  success: boolean;
  enhancement_strategy?: string;
  quality_improvement?: number;
}

export function PromptManagementTab() {
  const [activeTab, setActiveTab] = useState('templates');
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [negativePrompts, setNegativePrompts] = useState<NegativePrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingCache, setIsRefreshingCache] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModel, setFilterModel] = useState('all');
  const [filterContentMode, setFilterContentMode] = useState('all');
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [isCreatingNegative, setIsCreatingNegative] = useState(false);
  const { toast } = useToast();

  // Token estimation utility
  const estimateTokens = useCallback((text: string) => {
    const wordCount = text.split(/\s+/).length;
    const charCount = text.length;
    const baseTokens = wordCount * 0.75;
    const punctuationTokens = (text.match(/[.,!?;:()"\-]/g) || []).length * 0.1;
    const extraTokens = Math.max(0, (charCount - wordCount * 4) / 4);
    return Math.ceil(baseTokens + punctuationTokens + extraTokens);
  }, []);

  // Load all data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadPromptTemplates(),
        loadNegativePrompts()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load prompt management data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPromptTemplates = async () => {
    const { data, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setPromptTemplates(data || []);
  };

  const loadNegativePrompts = async () => {
    const { data, error } = await supabase
      .from('negative_prompts')
      .select('*')
      .order('priority', { ascending: false });

    if (error) throw error;
    setNegativePrompts(data || []);
  };


  // Cache refresh functionality
  const refreshPromptCache = async () => {
    setIsRefreshingCache(true);
    try {
      const { data, error } = await supabase.functions.invoke('refresh-prompt-cache', {
        body: { force_refresh: true }
      });

      if (error) throw error;

      toast({
        title: 'Cache Refreshed',
        description: 'Prompt cache has been successfully refreshed',
      });
    } catch (error) {
      console.error('Error refreshing cache:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh prompt cache',
        variant: 'destructive'
      });
    } finally {
      setIsRefreshingCache(false);
    }
  };

  // Template CRUD operations
  const updateTemplate = async (id: string, updates: Partial<PromptTemplate>) => {
    const { error } = await supabase
      .from('prompt_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
    await loadPromptTemplates();
    toast({ title: 'Success', description: 'Template updated successfully' });
  };

  const createTemplate = async (templateType: 'enhancement' | 'chat' = 'enhancement') => {
    setIsCreatingTemplate(true);
    try {
      const chatDefaults = {
        template_name: 'New Chat Template',
        enhancer_model: 'qwen_instruct',
        use_case: 'roleplay',
        job_type: 'chat',
        system_prompt: 'You are a helpful AI assistant...',
      };
      
      const enhancementDefaults = {
        template_name: 'New Template',
        enhancer_model: 'sdxl',
        use_case: 'enhancement',
        job_type: 'enhancement',
        system_prompt: 'Enter your system prompt here...',
      };
      
      const defaults = templateType === 'chat' ? chatDefaults : enhancementDefaults;
      
      const { error } = await supabase
        .from('prompt_templates')
        .insert({
          ...defaults,
          content_mode: 'sfw',
          token_limit: 512,
          is_active: true,
          metadata: {}
        });

      if (error) throw error;
      await loadPromptTemplates();
      toast({ title: 'Success', description: 'Template created successfully' });
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: 'Error',
        description: 'Failed to create template',
        variant: 'destructive'
      });
    } finally {
      setIsCreatingTemplate(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('prompt_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await loadPromptTemplates();
      toast({ title: 'Success', description: 'Template deleted successfully' });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive'
      });
    }
  };

  // Negative prompt CRUD operations
  const updateNegativePrompt = async (id: string, updates: Partial<NegativePrompt>) => {
    const { error } = await supabase
      .from('negative_prompts')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
    await loadNegativePrompts();
    toast({ title: 'Success', description: 'Negative prompt updated successfully' });
  };

  const createNegativePrompt = async () => {
    setIsCreatingNegative(true);
    try {
      const { error } = await supabase
        .from('negative_prompts')
        .insert({
          model_type: 'sdxl',
          content_mode: 'sfw',
          negative_prompt: 'Enter negative prompt here...',
          description: 'New negative prompt',
          is_active: true,
          priority: 1
        });

      if (error) throw error;
      await loadNegativePrompts();
      toast({ title: 'Success', description: 'Negative prompt created successfully' });
    } catch (error) {
      console.error('Error creating negative prompt:', error);
      toast({
        title: 'Error',
        description: 'Failed to create negative prompt',
        variant: 'destructive'
      });
    } finally {
      setIsCreatingNegative(false);
    }
  };

  const deleteNegativePrompt = async (id: string) => {
    try {
      const { error } = await supabase
        .from('negative_prompts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await loadNegativePrompts();
      toast({ title: 'Success', description: 'Negative prompt deleted successfully' });
    } catch (error) {
      console.error('Error deleting negative prompt:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete negative prompt',
        variant: 'destructive'
      });
    }
  };

  // Filter data based on search and filters
  const getFilteredTemplates = () => {
    return promptTemplates.filter(template => {
      const matchesSearch = template.template_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           template.use_case.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           template.system_prompt.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesModel = filterModel === 'all' || template.enhancer_model === filterModel;
      const matchesContent = filterContentMode === 'all' || template.content_mode === filterContentMode;
      return matchesSearch && matchesModel && matchesContent;
    });
  };

  const getFilteredNegatives = () => {
    return negativePrompts.filter(negative => {
      const matchesSearch = negative.negative_prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (negative.description && negative.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesModel = filterModel === 'all' || negative.model_type === filterModel;
      const matchesContent = filterContentMode === 'all' || negative.content_mode === filterContentMode;
      return matchesSearch && matchesModel && matchesContent;
    });
  };

  const getChatTemplates = () => {
    return promptTemplates.filter(template => template.job_type === 'chat');
  };

  const getEnhancementTemplates = () => {
    return promptTemplates.filter(template => template.job_type !== 'chat');
  };

  const getFilteredChatTemplates = () => {
    return getChatTemplates().filter(template => {
      const matchesSearch = template.template_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           template.use_case.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           template.system_prompt.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesModel = filterModel === 'all' || template.enhancer_model === filterModel;
      const matchesContent = filterContentMode === 'all' || template.content_mode === filterContentMode;
      return matchesSearch && matchesModel && matchesContent;
    });
  };

  // Test prompt functionality
  const testPrompt = async (template: PromptTemplate) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          prompt: 'Test prompt for quality assessment',
          enhancement_only: true,
          jobType: template.enhancer_model === 'sdxl' ? 'sdxl_image_fast' : 'image_fast',
          format: 'image',
          quality: 'fast',
          selectedModel: 'qwen_instruct',
          selectedPresets: []
        }
      });

      if (error) throw error;

      toast({
        title: 'Test Complete',
        description: `Prompt test completed. Enhancement: ${data.enhancement_strategy || 'none'}`,
      });
    } catch (error) {
      console.error('Error testing prompt:', error);
      toast({
        title: 'Test Failed',
        description: 'Failed to test prompt template',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading prompt management...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Prompt Management</h2>
          <div className="flex gap-4 text-xs text-muted-foreground mt-1">
            <span>Templates: {promptTemplates.length} ({promptTemplates.filter(t => t.is_active).length} active)</span>
            <span>Negatives: {negativePrompts.length} ({negativePrompts.filter(n => n.is_active).length} active)</span>
          </div>
        </div>
        <button
          onClick={refreshPromptCache}
          disabled={isRefreshingCache}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
        >
          {isRefreshingCache ? 'Refreshing...' : 'Refresh Cache'}
        </button>
      </div>

      {/* Search and filters */}
      <div className="flex gap-3">
        <Input
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8 text-xs max-w-[200px]"
        />
        
        <Select value={filterModel} onValueChange={setFilterModel}>
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Models</SelectItem>
            <SelectItem value="sdxl">SDXL</SelectItem>
            <SelectItem value="wan">WAN</SelectItem>
            <SelectItem value="qwen_base">Qwen Base</SelectItem>
            <SelectItem value="qwen_instruct">Qwen Instruct</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterContentMode} onValueChange={setFilterContentMode}>
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Content</SelectItem>
            <SelectItem value="sfw">SFW</SelectItem>
            <SelectItem value="nsfw">NSFW</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
        <TabsList className="grid w-full grid-cols-4 h-8 text-xs">
          <TabsTrigger value="templates" className="text-xs">Enhancement</TabsTrigger>
          <TabsTrigger value="chat" className="text-xs">Chat</TabsTrigger>
          <TabsTrigger value="negatives" className="text-xs">Negative</TabsTrigger>
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
        </TabsList>

        {/* Enhancement Templates Tab */}
        <TabsContent value="templates" className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">
              Enhancement Templates ({getFilteredTemplates().filter(t => t.job_type !== 'chat').length})
            </span>
            <button
              onClick={() => createTemplate('enhancement')}
              disabled={isCreatingTemplate}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              {isCreatingTemplate ? 'Creating...' : '+ Add Enhancement Template'}
            </button>
          </div>

          <PromptTemplatesTable
            templates={getFilteredTemplates().filter(t => t.job_type !== 'chat')}
            onUpdate={updateTemplate}
            onDelete={deleteTemplate}
            onTest={testPrompt}
            estimateTokens={estimateTokens}
          />
        </TabsContent>

        {/* Chat Templates Tab */}
        <TabsContent value="chat" className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">
              Chat Templates ({getFilteredChatTemplates().length})
            </span>
            <button
              onClick={() => createTemplate('chat')}
              disabled={isCreatingTemplate}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              {isCreatingTemplate ? 'Creating...' : '+ Add Chat Template'}
            </button>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg mb-3 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>SFW Chat Templates:</strong>
                <ul className="list-disc list-inside ml-4 text-muted-foreground mt-1">
                  <li>General conversation</li>
                  <li>Admin assistance</li>
                  <li>Creative writing</li>
                </ul>
              </div>
              <div>
                <strong>NSFW Chat Templates:</strong>
                <ul className="list-disc list-inside ml-4 text-muted-foreground mt-1">
                  <li>General adult conversation</li>
                  <li>Roleplay scenarios</li>
                  <li>Creative adult content</li>
                  <li>SDXL conversion</li>
                </ul>
              </div>
            </div>
          </div>

          <PromptTemplatesTable
            templates={getFilteredChatTemplates()}
            onUpdate={updateTemplate}
            onDelete={deleteTemplate}
            onTest={testPrompt}
            estimateTokens={estimateTokens}
          />
        </TabsContent>

        {/* Negative Prompts Tab */}
        <TabsContent value="negatives" className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">
              Negative Prompts ({getFilteredNegatives().length})
            </span>
            <button
              onClick={createNegativePrompt}
              disabled={isCreatingNegative}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              {isCreatingNegative ? 'Creating...' : '+ Add Negative Prompt'}
            </button>
          </div>

          <NegativePromptsTable
            negatives={getFilteredNegatives()}
            onUpdate={updateNegativePrompt}
            onDelete={deleteNegativePrompt}
            estimateTokens={estimateTokens}
          />
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Enhancement Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getEnhancementTemplates().length}</div>
                <p className="text-xs text-muted-foreground">Active enhancement templates</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Chat Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getChatTemplates().length}</div>
                <p className="text-xs text-muted-foreground">Active chat templates</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Negative Prompts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{negativePrompts.length}</div>
                <p className="text-xs text-muted-foreground">Active negative prompts</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Chat Template Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {['roleplay', 'chat', 'creative', 'admin', 'general'].map(useCase => {
                  const count = getChatTemplates().filter(t => t.use_case === useCase).length;
                  const displayName = useCase.replace('_', ' ');
                  return (
                    <div key={useCase} className="flex justify-between">
                      <span className="capitalize text-xs">{displayName}</span>
                      <Badge variant="secondary" className="text-xs">{count}</Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Content Mode Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {['sfw', 'nsfw'].map(mode => {
                  const enhancementCount = getEnhancementTemplates().filter(t => t.content_mode === mode).length;
                  const chatCount = getChatTemplates().filter(t => t.content_mode === mode).length;
                  return (
                    <div key={mode} className="space-y-1">
                      <div className="flex justify-between">
                        <span className="uppercase font-medium text-xs">{mode}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground ml-4">
                        <span>Enhancement: {enhancementCount}</span>
                        <span>Chat: {chatCount}</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}