
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { useAdminApiProviders } from '@/hooks/useApiProviders';

interface ApiProvider {
  id: string;
  name: string;
  display_name: string;
  base_url: string | null;
  docs_url: string | null;
  auth_scheme: string;
  auth_header_name: string | null;
  secret_name: string | null;
  is_active: boolean;
  created_at: string;
}

export const ApiProvidersTab: React.FC = () => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    base_url: '',
    docs_url: '',
    auth_scheme: 'bearer',
    auth_header_name: 'Authorization',
    secret_name: '',
    is_active: true
  });

  const queryClient = useQueryClient();

  const { data: providers, isLoading } = useAdminApiProviders();

  const addProviderMutation = useMutation({
    mutationFn: async (provider: Omit<ApiProvider, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('api_providers')
        .insert([provider])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-providers-admin'] });
      setIsAdding(false);
      resetForm();
      toast.success('API provider added successfully');
    },
    onError: (error: any) => {
      console.error('Error adding provider:', error);
      const message = error?.message || 'Failed to add API provider';
      if (message.includes('duplicate key')) {
        toast.error('A provider with this name already exists');
      } else {
        toast.error(message);
      }
    }
  });

  const updateProviderMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ApiProvider> & { id: string }) => {
      const { data, error } = await supabase
        .from('api_providers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-providers-admin'] });
      setEditingId(null);
      resetForm();
      toast.success('API provider updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating provider:', error);
      const message = error?.message || 'Failed to update API provider';
      if (message.includes('duplicate key')) {
        toast.error('A provider with this name already exists');
      } else {
        toast.error(message);
      }
    }
  });

  const deleteProviderMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('api_providers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-providers-admin'] });
      toast.success('API provider deleted successfully');
    },
    onError: (error: any) => {
      console.error('Error deleting provider:', error);
      const message = error?.message || 'Failed to delete API provider';
      if (message.includes('foreign key')) {
        toast.error('Cannot delete provider - it has associated models');
      } else {
        toast.error(message);
      }
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      display_name: '',
      base_url: '',
      docs_url: '',
      auth_scheme: 'bearer',
      auth_header_name: 'Authorization',
      secret_name: '',
      is_active: true
    });
  };

  const sanitizeFormData = (data: typeof formData) => {
    return {
      name: data.name.trim(),
      display_name: data.display_name.trim(),
      base_url: data.base_url.trim() || null,
      docs_url: data.docs_url.trim() || null,
      auth_scheme: data.auth_scheme,
      auth_header_name: data.auth_header_name.trim() || null,
      secret_name: data.secret_name.trim() || null,
      is_active: data.is_active
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name.trim() || !formData.display_name.trim()) {
      toast.error('Name and Display Name are required');
      return;
    }
    
    const sanitizedData = sanitizeFormData(formData);
    
    if (editingId) {
      updateProviderMutation.mutate({ id: editingId, ...sanitizedData });
    } else {
      addProviderMutation.mutate(sanitizedData);
    }
  };

  const startEdit = (provider: ApiProvider) => {
    setFormData({
      name: provider.name,
      display_name: provider.display_name,
      base_url: provider.base_url || '',
      docs_url: provider.docs_url || '',
      auth_scheme: provider.auth_scheme,
      auth_header_name: provider.auth_header_name || 'Authorization',
      secret_name: provider.secret_name || '',
      is_active: provider.is_active
    });
    setEditingId(provider.id);
    setIsAdding(true);
  };

  if (isLoading) {
    return <div className="p-4">Loading API providers...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">API Providers</h3>
        <Button
          onClick={() => {
            setIsAdding(true);
            resetForm();
            setEditingId(null);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Provider
        </Button>
      </div>

      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Provider' : 'Add New Provider'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name (unique identifier)</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="replicate"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    placeholder="Replicate"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="base_url">Base URL</Label>
                  <Input
                    id="base_url"
                    value={formData.base_url}
                    onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                    placeholder="https://api.replicate.com"
                  />
                </div>
                <div>
                  <Label htmlFor="docs_url">Documentation URL</Label>
                  <Input
                    id="docs_url"
                    value={formData.docs_url}
                    onChange={(e) => setFormData({ ...formData, docs_url: e.target.value })}
                    placeholder="https://replicate.com/docs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="auth_scheme">Auth Scheme</Label>
                  <Select
                    value={formData.auth_scheme}
                    onValueChange={(value) => setFormData({ ...formData, auth_scheme: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                      <SelectItem value="api_key_header">API Key Header</SelectItem>
                      <SelectItem value="query">Query Parameter</SelectItem>
                      <SelectItem value="none">No Auth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="auth_header_name">Auth Header Name</Label>
                  <Input
                    id="auth_header_name"
                    value={formData.auth_header_name}
                    onChange={(e) => setFormData({ ...formData, auth_header_name: e.target.value })}
                    placeholder="Authorization"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="secret_name">Secret Name (in Supabase)</Label>
                <Input
                  id="secret_name"
                  value={formData.secret_name}
                  onChange={(e) => setFormData({ ...formData, secret_name: e.target.value })}
                  placeholder="REPLICATE_API_TOKEN"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={addProviderMutation.isPending || updateProviderMutation.isPending}>
                  {editingId ? 'Update' : 'Add'} Provider
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
        {providers?.map((provider) => (
          <Card key={provider.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{provider.display_name}</h4>
                    <code className="text-sm bg-muted px-2 py-1 rounded">{provider.name}</code>
                    {!provider.is_active && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Inactive</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Auth: {provider.auth_scheme} | Secret: {provider.secret_name || 'None'}
                  </p>
                  {provider.base_url && (
                    <p className="text-xs text-muted-foreground">{provider.base_url}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startEdit(provider)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteProviderMutation.mutate(provider.id)}
                    disabled={deleteProviderMutation.isPending}
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
