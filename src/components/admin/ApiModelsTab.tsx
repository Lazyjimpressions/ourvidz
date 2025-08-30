import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminApiProviders } from '@/hooks/useApiProviders';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ApiProvider {
  id: string;
  name: string;
  display_name: string;
  base_url: string | null;
  is_active: boolean;
}

interface SafeApiProvider {
  id: string;
  name: string;
  display_name: string;
  is_active: boolean;
}

interface ApiModel {
  id: string;
  provider_id: string;
  model_key: string;
  version: string | null;
  display_name: string;
  modality: 'image' | 'video' | 'chat' | 'prompt' | 'audio' | 'embedding' | 'roleplay';
  task: 'generation' | 'enhancement' | 'moderation' | 'style_transfer' | 'upscale' | 'roleplay' | 'tts' | 'stt' | 'chat' | 'embedding';
  model_family: string | null;
  endpoint_path: string | null;
  input_defaults: any;
  capabilities: any;
  pricing: any;
  output_format: string | null;
  is_active: boolean;
  is_default: boolean;
  priority: number;
}

const MODALITIES = ['image', 'video', 'chat', 'prompt', 'audio', 'embedding', 'roleplay'] as const;
const TASKS = ['generation', 'enhancement', 'moderation', 'style_transfer', 'upscale', 'roleplay', 'tts', 'stt', 'chat', 'embedding'] as const;

export const ApiModelsTab = () => {
  const queryClient = useQueryClient();
  const [editingModel, setEditingModel] = useState<ApiModel | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch providers for the dropdown using secure hook
  const { data: providers } = useAdminApiProviders();

  // Fetch models with provider info (only safe fields)
  const { data: models, isLoading } = useQuery({
    queryKey: ['api-models'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_models')
        .select(`
          *,
          api_providers!inner(id, name, display_name, is_active)
        `)
        .order('priority', { ascending: false })
        .order('display_name');
      
      if (error) throw error;
      return data as (ApiModel & { api_providers: SafeApiProvider })[];
    }
  });

  // Create model mutation
  const createModelMutation = useMutation({
    mutationFn: async (model: Omit<ApiModel, 'id'>) => {
      const { data, error } = await supabase
        .from('api_models')
        .insert([model])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-models'] });
      toast.success('Model created successfully');
      setIsCreating(false);
    },
    onError: (error) => {
      console.error('Error creating model:', error);
      toast.error('Failed to create model');
    }
  });

  // Update model mutation
  const updateModelMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ApiModel> & { id: string }) => {
      const { data, error } = await supabase
        .from('api_models')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-models'] });
      toast.success('Model updated successfully');
      setEditingModel(null);
    },
    onError: (error) => {
      console.error('Error updating model:', error);
      toast.error('Failed to update model');
    }
  });

  // Delete model mutation
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
      toast.success('Model deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting model:', error);
      toast.error('Failed to delete model');
    }
  });

  const ModelForm = ({ model, onSubmit, onCancel }: {
    model?: ApiModel;
    onSubmit: (data: Omit<ApiModel, 'id'>) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState<Omit<ApiModel, 'id'>>({
      provider_id: model?.provider_id || '',
      model_key: model?.model_key || '',
      version: model?.version || null,
      display_name: model?.display_name || '',
      modality: model?.modality || 'image',
      task: model?.task || 'generation',
      model_family: model?.model_family || null,
      endpoint_path: model?.endpoint_path || null,
      input_defaults: model?.input_defaults || {},
      capabilities: model?.capabilities || {},
      pricing: model?.pricing || {},
      output_format: model?.output_format || null,
      is_active: model?.is_active ?? true,
      is_default: model?.is_default ?? false,
      priority: model?.priority || 0
    });

    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{model ? 'Edit Model' : 'Create New Model'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Provider</Label>
              <Select 
                value={formData.provider_id} 
                onValueChange={(value) => setFormData({...formData, provider_id: value})}
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
              <Label>Display Name</Label>
              <Input
                value={formData.display_name}
                onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                placeholder="e.g., RV5.1, FLUX Schnell"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Model Key</Label>
              <Input
                value={formData.model_key}
                onChange={(e) => setFormData({...formData, model_key: e.target.value})}
                placeholder="e.g., lucataco/realistic-vision-v5.1"
              />
            </div>
            
            <div>
              <Label>Version (Optional)</Label>
              <Input
                value={formData.version || ''}
                onChange={(e) => setFormData({...formData, version: e.target.value || null})}
                placeholder="e.g., version hash or string"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Modality</Label>
              <Select 
                value={formData.modality} 
                onValueChange={(value: any) => setFormData({...formData, modality: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODALITIES.map((modality) => (
                    <SelectItem key={modality} value={modality}>
                      {modality}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Task</Label>
              <Select 
                value={formData.task} 
                onValueChange={(value: any) => setFormData({...formData, task: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASKS.map((task) => (
                    <SelectItem key={task} value={task}>
                      {task}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Priority</Label>
              <Input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Model Family (Optional)</Label>
              <Input
                value={formData.model_family || ''}
                onChange={(e) => setFormData({...formData, model_family: e.target.value || null})}
                placeholder="e.g., rv51, sdxl, flux"
              />
            </div>
            
            <div>
              <Label>Output Format (Optional)</Label>
              <Input
                value={formData.output_format || ''}
                onChange={(e) => setFormData({...formData, output_format: e.target.value || null})}
                placeholder="e.g., png, mp4"
              />
            </div>
          </div>

          <div>
            <Label>Endpoint Path (Optional)</Label>
            <Input
              value={formData.endpoint_path || ''}
              onChange={(e) => setFormData({...formData, endpoint_path: e.target.value || null})}
              placeholder="e.g., /v1/predictions for REST APIs"
            />
          </div>

          <div>
            <Label>Input Defaults (JSON)</Label>
            <Textarea
              value={JSON.stringify(formData.input_defaults, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setFormData({...formData, input_defaults: parsed});
                } catch {
                  // Invalid JSON, keep the string for now
                }
              }}
              placeholder='{"width": 1024, "height": 1024}'
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
              />
              <Label>Active</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData({...formData, is_default: checked})}
              />
              <Label>Default for this task</Label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => onSubmit(formData)}>
              {model ? 'Update' : 'Create'} Model
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return <div>Loading models...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">API Models</h2>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Model
        </Button>
      </div>

      {(isCreating || editingModel) && (
        <ModelForm
          model={editingModel || undefined}
          onSubmit={(data) => {
            if (editingModel) {
              updateModelMutation.mutate({ ...data, id: editingModel.id });
            } else {
              createModelMutation.mutate(data);
            }
          }}
          onCancel={() => {
            setIsCreating(false);
            setEditingModel(null);
          }}
        />
      )}

      <div className="grid gap-4">
        {models?.map((model) => (
          <Card key={model.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{model.display_name}</h3>
                    <Badge variant={model.is_active ? 'default' : 'secondary'}>
                      {model.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {model.is_default && (
                      <Badge variant="outline">Default</Badge>
                    )}
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div><strong>Provider:</strong> {model.api_providers.display_name}</div>
                    <div><strong>Model Key:</strong> {model.model_key}</div>
                    {model.version && <div><strong>Version:</strong> {model.version}</div>}
                    <div><strong>Type:</strong> {model.modality} - {model.task}</div>
                    {model.model_family && <div><strong>Family:</strong> {model.model_family}</div>}
                    <div><strong>Priority:</strong> {model.priority}</div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingModel(model)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this model?')) {
                        deleteModelMutation.mutate(model.id);
                      }
                    }}
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
