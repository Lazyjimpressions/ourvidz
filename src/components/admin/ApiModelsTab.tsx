import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminApiProviders } from '@/hooks/useApiProviders';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { EditableCell } from './EditableCell';
import { Plus, Pencil, Trash2, ChevronRight, Star, X } from 'lucide-react';
import { toast } from 'sonner';

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
}

const MODALITIES = ['image', 'video', 'chat', 'prompt', 'audio', 'embedding', 'roleplay'] as const;
const TASKS = ['generation', 'enhancement', 'moderation', 'style_transfer', 'upscale', 'roleplay', 'tts', 'stt', 'chat', 'embedding'] as const;

export const ApiModelsTab = () => {
  const queryClient = useQueryClient();
  const [editingModel, setEditingModel] = useState<(ApiModel & { api_providers: SafeApiProvider }) | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCellId, setEditingCellId] = useState<string | null>(null);
  const [filterModality, setFilterModality] = useState<string>('all');
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const { data: providers } = useAdminApiProviders();

  const { data: models, isLoading } = useQuery({
    queryKey: ['api-models'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_models')
        .select(`*, api_providers!inner(id, name, display_name, is_active)`)
        .order('priority', { ascending: false })
        .order('display_name');
      if (error) throw error;
      return data as (ApiModel & { api_providers: SafeApiProvider })[];
    }
  });

  // Initialize expanded sections when models load
  React.useEffect(() => {
    if (models && expandedSections.size === 0) {
      const modalities = new Set(models.map(m => m.modality));
      setExpandedSections(modalities);
    }
  }, [models]);

  const filteredModels = useMemo(() => {
    if (!models) return [];
    return models.filter(m => {
      if (filterModality !== 'all' && m.modality !== filterModality) return false;
      if (filterProvider !== 'all' && m.provider_id !== filterProvider) return false;
      return true;
    });
  }, [models, filterModality, filterProvider]);

  const groupedModels = useMemo(() => {
    const groups: Record<string, (ApiModel & { api_providers: SafeApiProvider })[]> = {};
    filteredModels.forEach(m => {
      const key = m.modality.toUpperCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });
    // Sort within each group by priority DESC then display_name ASC
    Object.values(groups).forEach(arr =>
      arr.sort((a, b) => b.priority - a.priority || a.display_name.localeCompare(b.display_name))
    );
    return groups;
  }, [filteredModels]);

  const updateModelMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ApiModel> & { id: string }) => {
      const { data, error } = await supabase
        .from('api_models').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-models'] });
      toast.success('Model updated');
    },
    onError: () => toast.error('Failed to update model')
  });

  const createModelMutation = useMutation({
    mutationFn: async (model: Omit<ApiModel, 'id'>) => {
      const { data, error } = await supabase
        .from('api_models').insert([model]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-models'] });
      toast.success('Model created');
      setShowAddForm(false);
    },
    onError: () => toast.error('Failed to create model')
  });

  const deleteModelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('api_models').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-models'] });
      toast.success('Model deleted');
    },
    onError: () => toast.error('Failed to delete model')
  });

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const uniqueModalities = useMemo(() => {
    if (!models) return [];
    return [...new Set(models.map(m => m.modality))];
  }, [models]);

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Loading models...</div>;

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Header + Filters */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">API Models</h2>
          <div className="flex items-center gap-2">
            <Select value={filterModality} onValueChange={setFilterModality}>
              <SelectTrigger className="h-7 text-xs w-[110px]">
                <SelectValue placeholder="Modality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueModalities.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterProvider} onValueChange={setFilterProvider}>
              <SelectTrigger className="h-7 text-xs w-[120px]">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                {providers?.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-7 text-xs" onClick={() => { setShowAddForm(true); setEditingModel(null); }}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {(showAddForm || editingModel) && (
          <ModelForm
            model={editingModel || undefined}
            providers={providers || []}
            onSubmit={(data) => {
              if (editingModel) {
                updateModelMutation.mutate({ ...data, id: editingModel.id });
                setEditingModel(null);
              } else {
                createModelMutation.mutate(data);
              }
            }}
            onCancel={() => { setShowAddForm(false); setEditingModel(null); }}
          />
        )}

        {/* Grouped Tables */}
        {Object.entries(groupedModels).sort(([a], [b]) => a.localeCompare(b)).map(([modality, group]) => {
          const activeCount = group.filter(m => m.is_active).length;
          const isOpen = expandedSections.has(modality.toLowerCase());

          return (
            <Collapsible key={modality} open={isOpen} onOpenChange={() => toggleSection(modality.toLowerCase())}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full py-1.5 px-2 rounded hover:bg-muted/50 transition-colors">
                <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                <span className="text-xs font-semibold uppercase tracking-wider">{modality}</span>
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                  {activeCount}/{group.length}
                </Badge>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Table>
                  <TableHeader>
                    <TableRow className="text-[10px]">
                      <TableHead className="h-7 px-2 text-[10px]">Name</TableHead>
                      <TableHead className="h-7 px-2 text-[10px] w-[90px]">Provider</TableHead>
                      <TableHead className="h-7 px-2 text-[10px] w-[80px]">Task</TableHead>
                      <TableHead className="h-7 px-2 text-[10px] w-[160px]">Model Key</TableHead>
                      <TableHead className="h-7 px-2 text-[10px] w-[70px]">Family</TableHead>
                      <TableHead className="h-7 px-2 text-[10px] w-[45px]">Pri</TableHead>
                      <TableHead className="h-7 px-2 text-[10px] w-[35px]">Def</TableHead>
                      <TableHead className="h-7 px-2 text-[10px] w-[45px]">On</TableHead>
                      <TableHead className="h-7 px-2 text-[10px] w-[55px]">Acts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.map(model => (
                      <ModelRow
                        key={model.id}
                        model={model}
                        editingCellId={editingCellId}
                        setEditingCellId={setEditingCellId}
                        onUpdate={(updates) => updateModelMutation.mutate({ id: model.id, ...updates })}
                        onEdit={() => { setEditingModel(model); setShowAddForm(false); }}
                        onDelete={() => deleteModelMutation.mutate(model.id)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </CollapsibleContent>
            </Collapsible>
          );
        })}

        {Object.keys(groupedModels).length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8">No models match the current filters.</div>
        )}
      </div>
    </TooltipProvider>
  );
};

/* ─── Model Row ─── */

function ModelRow({ model, editingCellId, setEditingCellId, onUpdate, onEdit, onDelete }: {
  model: ApiModel & { api_providers: SafeApiProvider };
  editingCellId: string | null;
  setEditingCellId: (id: string | null) => void;
  onUpdate: (updates: Partial<ApiModel>) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cellId = (field: string) => `${model.id}-${field}`;

  return (
    <TableRow className="text-xs h-8">
      {/* Display Name - inline editable */}
      <TableCell className="p-1">
        <EditableCell
          value={model.display_name}
          type="text"
          isEditing={editingCellId === cellId('name')}
          onEditingChange={(e) => setEditingCellId(e ? cellId('name') : null)}
          onSave={(v) => onUpdate({ display_name: v })}
          truncateAt={25}
        />
      </TableCell>

      {/* Provider - read only badge */}
      <TableCell className="p-1">
        <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
          {model.api_providers.display_name}
        </Badge>
      </TableCell>

      {/* Task */}
      <TableCell className="p-1">
        <span className="text-[11px] text-muted-foreground">{model.task}</span>
      </TableCell>

      {/* Model Key - truncated with tooltip */}
      <TableCell className="p-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <EditableCell
                value={model.model_key}
                type="text"
                isEditing={editingCellId === cellId('key')}
                onEditingChange={(e) => setEditingCellId(e ? cellId('key') : null)}
                onSave={(v) => onUpdate({ model_key: v })}
                truncateAt={22}
                className="font-mono text-[10px]"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs font-mono max-w-[300px] break-all">
            {model.model_key}
          </TooltipContent>
        </Tooltip>
      </TableCell>

      {/* Family */}
      <TableCell className="p-1">
        <EditableCell
          value={model.model_family || ''}
          type="text"
          isEditing={editingCellId === cellId('family')}
          onEditingChange={(e) => setEditingCellId(e ? cellId('family') : null)}
          onSave={(v) => onUpdate({ model_family: v || null })}
          truncateAt={10}
          placeholder="—"
        />
      </TableCell>

      {/* Priority */}
      <TableCell className="p-1">
        <EditableCell
          value={model.priority}
          type="number"
          isEditing={editingCellId === cellId('priority')}
          onEditingChange={(e) => setEditingCellId(e ? cellId('priority') : null)}
          onSave={(v) => onUpdate({ priority: parseInt(v) || 0 })}
        />
      </TableCell>

      {/* Default - star toggle */}
      <TableCell className="p-1 text-center">
        <button
          onClick={() => onUpdate({ is_default: !model.is_default })}
          className="hover:scale-110 transition-transform"
        >
          <Star className={`h-3.5 w-3.5 ${model.is_default ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40'}`} />
        </button>
      </TableCell>

      {/* Active - switch toggle */}
      <TableCell className="p-1 text-center">
        <Switch
          checked={model.is_active}
          onCheckedChange={(checked) => onUpdate({ is_active: checked })}
          className="scale-75"
        />
      </TableCell>

      {/* Actions */}
      <TableCell className="p-1">
        <div className="flex items-center gap-0.5">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onEdit}>
            <Pencil className="h-3 w-3" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{model.display_name}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove this model configuration. Any references to it will break.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}

/* ─── Add/Edit Form (compact) ─── */

function ModelForm({ model, providers, onSubmit, onCancel }: {
  model?: ApiModel & { api_providers: SafeApiProvider };
  providers: SafeApiProvider[];
  onSubmit: (data: Omit<ApiModel, 'id'>) => void;
  onCancel: () => void;
}) {
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

  const set = (key: string, value: any) => setFormData(prev => ({ ...prev, [key]: value }));

  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {model ? 'Edit Model' : 'New Model'}
          </span>
          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={onCancel}>
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Row 1: Core fields */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">Provider</Label>
            <Select value={formData.provider_id} onValueChange={(v) => set('provider_id', v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {providers.map(p => <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Display Name</Label>
            <Input className="h-7 text-xs" value={formData.display_name} onChange={(e) => set('display_name', e.target.value)} placeholder="e.g., Seedream 4.5" />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Model Key</Label>
            <Input className="h-7 text-xs font-mono" value={formData.model_key} onChange={(e) => set('model_key', e.target.value)} placeholder="e.g., fal-ai/..." />
          </div>
        </div>

        {/* Row 2: Type fields */}
        <div className="grid grid-cols-4 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">Modality</Label>
            <Select value={formData.modality} onValueChange={(v) => set('modality', v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{MODALITIES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Task</Label>
            <Select value={formData.task} onValueChange={(v) => set('task', v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{TASKS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Priority</Label>
            <Input className="h-7 text-xs" type="number" value={formData.priority} onChange={(e) => set('priority', parseInt(e.target.value) || 0)} />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Family</Label>
            <Input className="h-7 text-xs" value={formData.model_family || ''} onChange={(e) => set('model_family', e.target.value || null)} placeholder="sdxl, flux..." />
          </div>
        </div>

        {/* Row 3: Optional fields */}
        <div className="grid grid-cols-4 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">Version</Label>
            <Input className="h-7 text-xs" value={formData.version || ''} onChange={(e) => set('version', e.target.value || null)} />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Output Format</Label>
            <Input className="h-7 text-xs" value={formData.output_format || ''} onChange={(e) => set('output_format', e.target.value || null)} placeholder="png, mp4" />
          </div>
          <div className="col-span-2">
            <Label className="text-[10px] text-muted-foreground">Endpoint Path</Label>
            <Input className="h-7 text-xs" value={formData.endpoint_path || ''} onChange={(e) => set('endpoint_path', e.target.value || null)} />
          </div>
        </div>

        {/* Row 4: JSON defaults */}
        <div>
          <Label className="text-[10px] text-muted-foreground">Input Defaults (JSON)</Label>
          <Textarea
            className="text-xs min-h-[50px] font-mono"
            value={JSON.stringify(formData.input_defaults, null, 2)}
            onChange={(e) => { try { set('input_defaults', JSON.parse(e.target.value)); } catch {} }}
            placeholder='{"width": 1024}'
          />
        </div>

        {/* Row 5: Toggles + actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Switch checked={formData.is_active} onCheckedChange={(v) => set('is_active', v)} className="scale-75" />
              <Label className="text-[10px]">Active</Label>
            </div>
            <div className="flex items-center gap-1.5">
              <Switch checked={formData.is_default} onCheckedChange={(v) => set('is_default', v)} className="scale-75" />
              <Label className="text-[10px]">Default</Label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onCancel}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" onClick={() => onSubmit(formData)}>
              {model ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
