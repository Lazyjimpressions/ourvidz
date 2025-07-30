import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Search,
  Filter,
  Eye,
  TestTube
} from 'lucide-react';

interface PromptTemplate {
  id: string;
  template_name: string;
  model_type: string;
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
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingCache, setIsRefreshingCache] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [editingNegative, setEditingNegative] = useState<NegativePrompt | null>(null);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [showCreateNegative, setShowCreateNegative] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModel, setFilterModel] = useState('all');
  const [filterContentMode, setFilterContentMode] = useState('all');
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
        loadNegativePrompts(),
        loadTestResults()
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

  const loadTestResults = async () => {
    const { data, error } = await supabase
      .from('model_test_results')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
      setTestResults((data || []).map(item => ({
        ...item,
        test_tier: item.test_tier as 'artistic' | 'explicit' | 'unrestricted',
        model_type: item.model_type as 'SDXL' | 'WAN' | 'LORA'
      })));
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
  const saveTemplate = async (template: Partial<PromptTemplate>) => {
    try {
      if (template.id) {
        const { error } = await supabase
          .from('prompt_templates')
          .update({
            template_name: template.template_name,
            model_type: template.model_type,
            use_case: template.use_case,
            content_mode: template.content_mode,
            system_prompt: template.system_prompt,
            token_limit: template.token_limit,
            is_active: template.is_active,
            metadata: template.metadata,
            updated_at: new Date().toISOString()
          })
          .eq('id', template.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Template updated successfully' });
      } else {
        const { error } = await supabase
          .from('prompt_templates')
          .insert({
            template_name: template.template_name!,
            model_type: template.model_type!,
            use_case: template.use_case!,
            content_mode: template.content_mode!,
            system_prompt: template.system_prompt!,
            token_limit: template.token_limit || 512,
            is_active: template.is_active ?? true,
            metadata: template.metadata || {}
          });

        if (error) throw error;
        toast({ title: 'Success', description: 'Template created successfully' });
      }

      await loadPromptTemplates();
      setEditingTemplate(null);
      setShowCreateTemplate(false);
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: 'Error',
        description: 'Failed to save template',
        variant: 'destructive'
      });
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
  const saveNegativePrompt = async (negative: Partial<NegativePrompt>) => {
    try {
      if (negative.id) {
        const { error } = await supabase
          .from('negative_prompts')
          .update({
            model_type: negative.model_type,
            content_mode: negative.content_mode,
            negative_prompt: negative.negative_prompt,
            description: negative.description,
            is_active: negative.is_active,
            priority: negative.priority,
            updated_at: new Date().toISOString()
          })
          .eq('id', negative.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Negative prompt updated successfully' });
      } else {
        const { error } = await supabase
          .from('negative_prompts')
          .insert({
            model_type: negative.model_type!,
            content_mode: negative.content_mode!,
            negative_prompt: negative.negative_prompt!,
            description: negative.description,
            is_active: negative.is_active ?? true,
            priority: negative.priority || 1
          });

        if (error) throw error;
        toast({ title: 'Success', description: 'Negative prompt created successfully' });
      }

      await loadNegativePrompts();
      setEditingNegative(null);
      setShowCreateNegative(false);
    } catch (error) {
      console.error('Error saving negative prompt:', error);
      toast({
        title: 'Error',
        description: 'Failed to save negative prompt',
        variant: 'destructive'
      });
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
      const matchesModel = filterModel === 'all' || template.model_type === filterModel;
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

  // Test prompt functionality
  const testPrompt = async (template: PromptTemplate) => {
    try {
      const { data, error } = await supabase.functions.invoke('enhance-prompt', {
        body: {
          prompt: 'Test prompt for quality assessment',
          jobType: template.model_type === 'sdxl' ? 'sdxl_image_fast' : 'image_fast',
          format: 'image',
          quality: 'fast',
          selectedModel: 'qwen_instruct',
          test_mode: true,
          template_id: template.id
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
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Prompt Management</h2>
          <p className="text-muted-foreground">Manage prompt templates and negative prompts for all models</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={refreshPromptCache}
            disabled={isRefreshingCache}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshingCache ? 'animate-spin' : ''}`} />
            {isRefreshingCache ? 'Refreshing...' : 'Refresh Cache'}
          </Button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates and prompts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={filterModel} onValueChange={setFilterModel}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by model" />
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
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by content" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Content</SelectItem>
            <SelectItem value="sfw">SFW</SelectItem>
            <SelectItem value="nsfw">NSFW</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="negatives">Negative Prompts</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Prompt Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Prompt Templates ({getFilteredTemplates().length})</h3>
            <Button onClick={() => setShowCreateTemplate(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Template
            </Button>
          </div>

          <div className="grid gap-4">
            {getFilteredTemplates().map((template) => (
              <Card key={template.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{template.template_name}</CardTitle>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{template.model_type}</Badge>
                        <Badge variant="outline">{template.use_case}</Badge>
                        <Badge variant={template.content_mode === 'nsfw' ? 'destructive' : 'default'}>
                          {template.content_mode.toUpperCase()}
                        </Badge>
                        <Badge variant={template.is_active ? 'default' : 'secondary'}>
                          {template.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => testPrompt(template)}
                        className="gap-1"
                      >
                        <TestTube className="h-4 w-4" />
                        Test
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingTemplate(template)}
                        className="gap-1"
                      >
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTemplate(template.id)}
                        className="gap-1 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">System Prompt</Label>
                      <div className="bg-muted rounded-md p-3 mt-1">
                        <p className="text-sm whitespace-pre-wrap">{template.system_prompt}</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Tokens: {estimateTokens(template.system_prompt)}/{template.token_limit}</span>
                      <span>Version: {template.version}</span>
                      <span>Updated: {new Date(template.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Negative Prompts Tab */}
        <TabsContent value="negatives" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Negative Prompts ({getFilteredNegatives().length})</h3>
            <Button onClick={() => setShowCreateNegative(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Negative Prompt
            </Button>
          </div>

          <div className="grid gap-4">
            {getFilteredNegatives().map((negative) => (
              <Card key={negative.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex gap-2">
                        <Badge variant="outline">{negative.model_type}</Badge>
                        <Badge variant={negative.content_mode === 'nsfw' ? 'destructive' : 'default'}>
                          {negative.content_mode.toUpperCase()}
                        </Badge>
                        <Badge variant="secondary">Priority: {negative.priority}</Badge>
                        <Badge variant={negative.is_active ? 'default' : 'secondary'}>
                          {negative.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {negative.description && (
                        <p className="text-sm text-muted-foreground mt-2">{negative.description}</p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingNegative(negative)}
                        className="gap-1"
                      >
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNegativePrompt(negative.id)}
                        className="gap-1 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="bg-muted rounded-md p-3">
                    <p className="text-sm">{negative.negative_prompt}</p>
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Tokens: {estimateTokens(negative.negative_prompt)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Testing Tab */}
        <TabsContent value="testing" className="space-y-4">
          <h3 className="text-lg font-semibold">Recent Test Results</h3>
          
          <div className="grid gap-4">
            {testResults.slice(0, 10).map((result) => (
              <Card key={result.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <Badge variant="outline">{result.model_type}</Badge>
                      <Badge variant={result.test_tier === 'unrestricted' ? 'destructive' : 'default'} className="ml-2">
                        {result.test_tier}
                      </Badge>
                      <Badge variant={result.success ? 'default' : 'destructive'} className="ml-2">
                        {result.success ? 'Success' : 'Failed'}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(result.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="text-sm text-muted-foreground mb-2">
                    Test Series: {result.test_series}
                  </div>
                  
                  <div className="bg-muted rounded-md p-3 mb-3">
                    <p className="text-sm">{result.prompt_text}</p>
                  </div>
                  
                  {result.success && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Overall: </span>
                        <span>{result.overall_quality}/10</span>
                      </div>
                      <div>
                        <span className="font-medium">Technical: </span>
                        <span>{result.technical_quality}/10</span>
                      </div>
                      <div>
                        <span className="font-medium">Content: </span>
                        <span>{result.content_quality}/10</span>
                      </div>
                      <div>
                        <span className="font-medium">Consistency: </span>
                        <span>{result.consistency}/10</span>
                      </div>
                    </div>
                  )}
                  
                  {result.notes && (
                    <div className="mt-3 text-sm text-muted-foreground">
                      <span className="font-medium">Notes: </span>
                      {result.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <h3 className="text-lg font-semibold">Prompt Performance Analytics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{promptTemplates.length}</div>
                <div className="text-sm text-muted-foreground">
                  {promptTemplates.filter(t => t.is_active).length} active
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Negative Prompts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{negativePrompts.length}</div>
                <div className="text-sm text-muted-foreground">
                  {negativePrompts.filter(n => n.is_active).length} active
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent Tests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{testResults.length}</div>
                <div className="text-sm text-muted-foreground">
                  {testResults.filter(t => t.success).length} successful
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Model Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(
                  promptTemplates.reduce((acc, template) => {
                    acc[template.model_type] = (acc[template.model_type] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([model, count]) => (
                  <div key={model} className="flex justify-between">
                    <span className="capitalize">{model}</span>
                    <span>{count} templates</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Editor Modal */}
      {(editingTemplate || showCreateTemplate) && (
        <TemplateEditor
          template={editingTemplate}
          onSave={saveTemplate}
          onCancel={() => {
            setEditingTemplate(null);
            setShowCreateTemplate(false);
          }}
          estimateTokens={estimateTokens}
        />
      )}

      {/* Negative Prompt Editor Modal */}
      {(editingNegative || showCreateNegative) && (
        <NegativePromptEditor
          negative={editingNegative}
          onSave={saveNegativePrompt}
          onCancel={() => {
            setEditingNegative(null);
            setShowCreateNegative(false);
          }}
          estimateTokens={estimateTokens}
        />
      )}
    </div>
  );
}

// Template Editor Component
function TemplateEditor({ 
  template, 
  onSave, 
  onCancel, 
  estimateTokens 
}: {
  template: PromptTemplate | null;
  onSave: (template: Partial<PromptTemplate>) => void;
  onCancel: () => void;
  estimateTokens: (text: string) => number;
}) {
  const [formData, setFormData] = useState({
    template_name: template?.template_name || '',
    model_type: template?.model_type || 'sdxl',
    use_case: template?.use_case || 'enhancement',
    content_mode: template?.content_mode || 'sfw',
    system_prompt: template?.system_prompt || '',
    token_limit: template?.token_limit || 512,
    is_active: template?.is_active ?? true,
    metadata: template?.metadata || {}
  });

  const tokenCount = estimateTokens(formData.system_prompt);
  const isOverLimit = tokenCount > formData.token_limit;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>{template ? 'Edit Template' : 'Create Template'}</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Template Name</Label>
              <Input
                value={formData.template_name}
                onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                placeholder="e.g., SDXL Enhancement Base"
              />
            </div>
            
            <div>
              <Label>Model Type</Label>
              <Select value={formData.model_type} onValueChange={(value) => setFormData({ ...formData, model_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sdxl">SDXL</SelectItem>
                  <SelectItem value="wan">WAN</SelectItem>
                  <SelectItem value="qwen_base">Qwen Base</SelectItem>
                  <SelectItem value="qwen_instruct">Qwen Instruct</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Use Case</Label>
              <Select value={formData.use_case} onValueChange={(value) => setFormData({ ...formData, use_case: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enhancement">Enhancement</SelectItem>
                  <SelectItem value="chat">Chat</SelectItem>
                  <SelectItem value="conversion">Conversion</SelectItem>
                  <SelectItem value="optimization">Optimization</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Content Mode</Label>
              <Select value={formData.content_mode} onValueChange={(value) => setFormData({ ...formData, content_mode: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sfw">SFW</SelectItem>
                  <SelectItem value="nsfw">NSFW</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Token Limit</Label>
            <Input
              type="number"
              value={formData.token_limit}
              onChange={(e) => setFormData({ ...formData, token_limit: parseInt(e.target.value) || 512 })}
              min="1"
              max="4096"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label>Active</Label>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>System Prompt</Label>
              <span className={`text-sm ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                {tokenCount}/{formData.token_limit} tokens
              </span>
            </div>
            <Textarea
              value={formData.system_prompt}
              onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
              placeholder="Enter the system prompt template..."
              rows={10}
              className={isOverLimit ? 'border-destructive' : ''}
            />
            {isOverLimit && (
              <Alert className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Token count exceeds limit. Consider reducing the prompt length.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={() => onSave({ ...template, ...formData })}
              disabled={!formData.template_name || !formData.system_prompt || isOverLimit}
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Negative Prompt Editor Component
function NegativePromptEditor({ 
  negative, 
  onSave, 
  onCancel, 
  estimateTokens 
}: {
  negative: NegativePrompt | null;
  onSave: (negative: Partial<NegativePrompt>) => void;
  onCancel: () => void;
  estimateTokens: (text: string) => number;
}) {
  const [formData, setFormData] = useState({
    model_type: negative?.model_type || 'sdxl',
    content_mode: negative?.content_mode || 'sfw',
    negative_prompt: negative?.negative_prompt || '',
    description: negative?.description || '',
    is_active: negative?.is_active ?? true,
    priority: negative?.priority || 1
  });

  const tokenCount = estimateTokens(formData.negative_prompt);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>{negative ? 'Edit Negative Prompt' : 'Create Negative Prompt'}</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Model Type</Label>
              <Select value={formData.model_type} onValueChange={(value) => setFormData({ ...formData, model_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sdxl">SDXL</SelectItem>
                  <SelectItem value="wan">WAN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Content Mode</Label>
              <Select value={formData.content_mode} onValueChange={(value) => setFormData({ ...formData, content_mode: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sfw">SFW</SelectItem>
                  <SelectItem value="nsfw">NSFW</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Priority (1-10)</Label>
            <Input
              type="number"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
              min="1"
              max="10"
            />
          </div>

          <div>
            <Label>Description (Optional)</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this negative prompt..."
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label>Active</Label>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Negative Prompt</Label>
              <span className="text-sm text-muted-foreground">
                {tokenCount} tokens
              </span>
            </div>
            <Textarea
              value={formData.negative_prompt}
              onChange={(e) => setFormData({ ...formData, negative_prompt: e.target.value })}
              placeholder="Enter negative prompt terms separated by commas..."
              rows={5}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={() => onSave({ ...negative, ...formData })}
              disabled={!formData.negative_prompt}
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}