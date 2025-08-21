
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Trash2, Plus, Edit } from 'lucide-react';

interface ApiModel {
  id: string;
  provider_id: string;
  model_key: string;
  version: string | null;
  display_name: string;
  modality: string;
  task: string;
  model_family: string | null;
  endpoint_path: string | null;
  input_defaults: any;
  capabilities: any;
  pricing: any;
  output_format: string | null;
  is_active: boolean;
  is_default: boolean;
  priority: number;
  created_at: string;
}

interface ApiProvider {
  id: string;
  name: string;
  display_name: string;
}

export const ApiModelsTab: React.FC = () => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    provider_id: '',
    model_key: '',
    version: '',
    display_name: '',
    modality: 'image',
    task: 'generation',
    model_family: '',
    endpoint_path: '',
    input_defaults: '{}',
    capabilities: '{}',
    pricing: '{}',
    output_format: '',
    is_active: true,
    is_default: false,
    priority: 0
  });

  const queryClient = useQueryClient();

  const { data: models, isLoading } = useQuery({
    queryKey: ['api-models'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_models')
        .select(`
          *,
          api_providers!inner(name, display_name)
        `)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as (ApiModel & { api_providers: ApiProvider })[];
    }
  });

  const { data: providers } = useQuery({
    queryKey: ['api-providers-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_providers')
        .select('id, name, display_name')
        .eq('is_active', true)
        .order('display_name');
      
      if (error) throw error;
      return data as ApiProvider[];
    }
  });

  const addModelMutation = useMutation({
    mutationFn: async (model: Omit<ApiModel, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('api_models')
        .insert([{
          ...model,
          input_defaults: JSON.parse(model.input_defaults || '{}'),
          capabilities: JSON.parse(model.capabilities || '{}'),
          pricing: JSON.parse(model.pricing || '{}')
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-models'] });
      setIsAdding(false);
      resetForm();
      toast.success('API model added successfully');
    },
    onError: (error) => {
      console.error('Error adding model:', error);
      toast.error('Failed to add API model');
    }
  });

  const updateModelMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ApiModel> & { id: string }) => {
      const { data, error } = await supabase
        .from('api_models')
        .update({
          ...updates,
          input_defaults: updates.input_defaults ? JSON.parse(updates.input_defaults as string) : undefined,
          capabilities: updates.capabilities ? JSON.parse(updates.capabilities as string) : undefined,
          pricing: updates.pricing ? JSON.parse(updates.pricing as string) : undefined
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-models'] });
      setEditingId(null);
      resetForm();
      toast.success('API model updated successfully');
    },
    onError: (error) => {
      console.error('Error updating model:', error);
      toast.error('Failed to update API model');
    }
  });

  const deleteModelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('api_models')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-models'] });
      toast.success('API model deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting model:', error);
      toast.error('Failed to delete API model');
    }
  });

  const resetForm = () => {
    setFormData({
      provider_id: '',
      model_key: '',
      version: '',
      display_name: '',
      modality: 'image',
      task: 'generation',
      model_family: '',
      endpoint_path: '',
      input_defaults: '{}',
      capabilities: '{}',
      pricing: '{}',
      output_format: '',
      is_active: true,
      is_default: false,
      priority: 0
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate JSON fields
    try {
      JSON.parse(formData.input_defaults || '{}');
      JSON.parse(formData.capabilities || '{}');
      JSON.parse(formData.pricing || '{}');
    } catch (error) {
      toast.error('Invalid JSON in configuration fields');
      return;
    }
    
    if (editingId) {
      updateModelMutation.mutate({ id: editingId, ...formData });
    } else {
      addModelMutation.mutate(formData as any);
    }
  };

  const startEdit = (model: ApiModel & { api_providers: ApiProvider }) => {
    setFormData({
      provider_id: model.provider_id,
      model_key: model.model_key,
      version: model.version || '',
      display_name: model.display_name,
      modality: model.modality,
      task: model.task,
      model_family: model.model_family || '',
      endpoint_path: model.endpoint_path || '',
      input_defaults: JSON.stringify(model.input_defaults || {}, null, 2),
      capabilities: JSON.stringify(model.capabilities || {}, null, 2),
      pricing: JSON.stringify(model.pricing || {}, null, 2),
      output_format: model.output_format || '',
      is_active: model.is_active,
      is_default: model.is_default,
      priority: model.priority
    });
    setEditingId(model.id);
    setIsAdding(true);
  };

  if (isLoading) {
    return <div className="p-4">Loading API models...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">API Models</h3>
        <Button
          onClick={() => {
            setIsAdding(true);
            resetForm();
            setEditingId(null);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Model
        </Button>
      </div>

      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Model' : 'Add New Model'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="provider_id">Provider</Label>
                  <Select
                    value={formData.provider_id}
                    onValueChange={(value) => setFormData({ ...formData, provider_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers?.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    placeholder="RV5.1"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="model_key">Model Key</Label>
                  <Input
                    id="model_key"
                    value={formData.model_key}
                    onChange={(e) => setFormData({ ...formData, model_key: e.target.value })}
                    placeholder="lucataco/realistic-vision-v5.1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="version">Version (optional)</Label>
                  <Input
                    id="version"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="Version hash or string"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="modality">Modality</Label>
                  <Select
                    value={formData.modality}
                    onValueChange={(value) => setFormData({ ...formData, modality: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="chat">Chat</SelectItem>
                      <SelectItem value="prompt">Prompt</SelectItem>
                      <SelectItem value="audio">Audio</SelectItem>
                      <SelectItem value="embedding">Embedding</SelectItem>
                      <SelectItem value="roleplay">Roleplay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="task">Task</Label>
                  <Select
                    value={formData.task}
                    onValueChange={(value) => setFormData({ ...formData, task: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="generation">Generation</SelectItem>
                      <SelectItem value="enhancement">Enhancement</SelectItem>
                      <SelectItem value="moderation">Moderation</SelectItem>
                      <SelectItem value="style_transfer">Style Transfer</SelectItem>
                      <SelectItem value="upscale">Upscale</SelectItem>
                      <SelectItem value="roleplay">Roleplay</SelectItem>
                      <SelectItem value="tts">Text-to-Speech</SelectItem>
                      <SelectItem value="stt">Speech-to-Text</SelectItem>
                      <SelectItem value="chat">Chat</SelectItem>
                      <SelectItem value="embedding">Embedding</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="model_family">Model Family</Label>
                  <Input
                    id="model_family"
                    value={formData.model_family}
                    onChange={(e) => setFormData({ ...formData, model_family: e.target.value })}
                    placeholder="rv51, flux, sdxl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="endpoint_path">Endpoint Path</Label>
                  <Input
                    id="endpoint_path"
                    value={formData.endpoint_path}
                    onChange={(e) => setFormData({ ...formData, endpoint_path: e.target.value })}
                    placeholder="/v1/predictions"
                  />
                </div>
                <div>
                  <Label htmlFor="output_format">Output Format</Label>
                  <Input
                    id="output_format"
                    value={formData.output_format}
                    onChange={(e) => setFormData({ ...formData, output_format: e.target.value })}
                    placeholder="png, webp, mp4"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="input_defaults">Input Defaults (JSON)</Label>
                <Textarea
                  id="input_defaults"
                  value={formData.input_defaults}
                  onChange={(e) => setFormData({ ...formData, input_defaults: e.target.value })}
                  placeholder='{"width": 1024, "height": 1024}'
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="capabilities">Capabilities (JSON)</Label>
                <Textarea
                  id="capabilities"
                  value={formData.capabilities}
                  onChange={(e) => setFormData({ ...formData, capabilities: e.target.value })}
                  placeholder='{"max_width": 2048, "supports_img2img": true}'
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="pricing">Pricing (JSON)</Label>
                <Textarea
                  id="pricing"
                  value={formData.pricing}
                  onChange={(e) => setFormData({ ...formData, pricing: e.target.value })}
                  placeholder='{"per_image": 0.01, "per_second": 0.05}'
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_default"
                    checked={formData.is_default}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                  />
                  <Label htmlFor="is_default">Default</Label>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={addModelMutation.isPending || updateModelMutation.isPending}>
                  {editingId ? 'Update' : 'Add'} Model
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {models?.map((model) => (
          <Card key={model.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{model.display_name}</h4>
                    <code className="text-sm bg-muted px-2 py-1 rounded">{model.model_key}</code>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {model.modality}/{model.task}
                    </span>
                    {model.is_default && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Default</span>
                    )}
                    {!model.is_active && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Inactive</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Provider: {model.api_providers.display_name} | Family: {model.model_family || 'None'}
                  </p>
                  {model.version && (
                    <p className="text-xs text-muted-foreground">Version: {model.version}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startEdit(model)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteModelMutation.mutate(model.id)}
                    disabled={deleteModelMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
