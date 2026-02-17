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
import { SchemaEditor, CapabilitiesEditor, type InputSchema } from './SchemaEditor';
import { Plus, Pencil, Trash2, ChevronRight, Star, X, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
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

const MODALITIES = ['image', 'video', 'chat'] as const;
const TASKS = ['generation', 'style_transfer', 'upscale', 'roleplay', 'reasoning', 'enhancement', 'embedding'] as const;

const formatResponseTime = (ms: number | null | undefined) => {
  if (ms === null || ms === undefined || ms === 0) return '--';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
};

const formatAvgCost = (cost: number | null | undefined) => {
  if (cost === null || cost === undefined || cost === 0) return '--';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(3)}`;
};

export const ApiModelsTab = () => {
  const queryClient = useQueryClient();
  const [editingModel, setEditingModel] = useState<(ApiModel & { api_providers: SafeApiProvider }) | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCellId, setEditingCellId] = useState<string | null>(null);
  const [filterModality, setFilterModality] = useState<string>('all');
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<string>('priority');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'priority' ? 'desc' : 'asc');
    }
  };

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

  // Fetch success-only usage stats from raw logs for accurate per-model averages
  const { data: modelUsageStats } = useQuery({
    queryKey: ['api-model-usage-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_usage_logs')
        .select('model_id, cost_usd, response_time_ms')
        .eq('response_status', 200)
        .not('model_id', 'is', null);
      if (error) throw error;
      
      // Aggregate in JS
      const statsMap = new Map<string, { requests: number; totalCost: number; totalTime: number }>();
      for (const row of data || []) {
        if (!row.model_id) continue;
        const existing = statsMap.get(row.model_id) || { requests: 0, totalCost: 0, totalTime: 0 };
        existing.requests++;
        existing.totalCost += Number(row.cost_usd) || 0;
        existing.totalTime += Number(row.response_time_ms) || 0;
        statsMap.set(row.model_id, existing);
      }
      
      const result = new Map<string, { avgCost: number; avgTime: number; requests: number }>();
      statsMap.forEach((stats, id) => {
        result.set(id, {
          avgCost: stats.requests > 0 ? stats.totalCost / stats.requests : 0,
          avgTime: stats.requests > 0 ? stats.totalTime / stats.requests : 0,
          requests: stats.requests
        });
      });
      return result;
    },
    staleTime: 2 * 60 * 1000,
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
    const dir = sortDir === 'asc' ? 1 : -1;
    Object.values(groups).forEach(arr =>
      arr.sort((a, b) => {
        let cmp = 0;
        const statsA = modelUsageStats?.get(a.id);
        const statsB = modelUsageStats?.get(b.id);
        switch (sortKey) {
          case 'display_name': cmp = a.display_name.localeCompare(b.display_name); break;
          case 'provider': cmp = a.api_providers.display_name.localeCompare(b.api_providers.display_name); break;
          case 'task': cmp = a.task.localeCompare(b.task); break;
          case 'model_key': cmp = a.model_key.localeCompare(b.model_key); break;
          case 'model_family': cmp = (a.model_family || '').localeCompare(b.model_family || ''); break;
          case 'avg_cost': cmp = (statsA?.avgCost || 0) - (statsB?.avgCost || 0); break;
          case 'avg_time': cmp = (statsA?.avgTime || 0) - (statsB?.avgTime || 0); break;
          case 'priority': cmp = a.priority - b.priority; break;
          case 'is_default': cmp = (a.is_default ? 1 : 0) - (b.is_default ? 1 : 0); break;
          case 'is_active': cmp = (a.is_active ? 1 : 0) - (b.is_active ? 1 : 0); break;
          default: cmp = 0;
        }
        return cmp * dir || a.display_name.localeCompare(b.display_name);
      })
    );
    return groups;
  }, [filteredModels, sortKey, sortDir, modelUsageStats]);

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
                      <SortableHead sortKey={sortKey} sortDir={sortDir} column="display_name" label="Name" onClick={handleSort} />
                      <SortableHead sortKey={sortKey} sortDir={sortDir} column="provider" label="Provider" onClick={handleSort} className="w-[90px]" />
                      <SortableHead sortKey={sortKey} sortDir={sortDir} column="task" label="Task" onClick={handleSort} className="w-[80px]" />
                      <SortableHead sortKey={sortKey} sortDir={sortDir} column="model_key" label="Model Key" onClick={handleSort} className="w-[160px]" />
                      <SortableHead sortKey={sortKey} sortDir={sortDir} column="model_family" label="Family" onClick={handleSort} className="w-[70px]" />
                      <SortableHead sortKey={sortKey} sortDir={sortDir} column="avg_cost" label="Avg Cost" onClick={handleSort} className="w-[70px] text-right" />
                      <SortableHead sortKey={sortKey} sortDir={sortDir} column="avg_time" label="Avg Time" onClick={handleSort} className="w-[70px] text-right" />
                      <SortableHead sortKey={sortKey} sortDir={sortDir} column="priority" label="Pri" onClick={handleSort} className="w-[45px]" />
                      <SortableHead sortKey={sortKey} sortDir={sortDir} column="is_default" label="Def" onClick={handleSort} className="w-[35px]" />
                      <SortableHead sortKey={sortKey} sortDir={sortDir} column="is_active" label="On" onClick={handleSort} className="w-[45px]" />
                      <TableHead className="h-7 px-2 text-[10px] w-[55px]">Acts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.map(model => {
                      const stats = modelUsageStats?.get(model.id);
                      return (
                      <ModelRow
                        key={model.id}
                        model={model}
                        avgCost={stats?.avgCost}
                        avgTime={stats?.avgTime}
                        editingCellId={editingCellId}
                        setEditingCellId={setEditingCellId}
                        onUpdate={(updates) => updateModelMutation.mutate({ id: model.id, ...updates })}
                        onEdit={() => { setEditingModel(model); setShowAddForm(false); }}
                        onDelete={() => deleteModelMutation.mutate(model.id)}
                      />
                      );
                    })}
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

/* ─── Sortable Header ─── */

function SortableHead({ sortKey, sortDir, column, label, onClick, className }: {
  sortKey: string;
  sortDir: 'asc' | 'desc';
  column: string;
  label: string;
  onClick: (key: string) => void;
  className?: string;
}) {
  const isActive = sortKey === column;
  const Icon = isActive ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <TableHead
      className={`h-7 px-2 text-[10px] cursor-pointer select-none hover:text-foreground transition-colors ${className || ''}`}
      onClick={() => onClick(column)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        <Icon className={`h-2.5 w-2.5 ${isActive ? 'text-foreground' : 'text-muted-foreground/40'}`} />
      </span>
    </TableHead>
  );
}

/* ─── Model Row ─── */

function ModelRow({ model, avgCost, avgTime, editingCellId, setEditingCellId, onUpdate, onEdit, onDelete }: {
  model: ApiModel & { api_providers: SafeApiProvider };
  avgCost?: number;
  avgTime?: number;
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

      {/* Avg Cost */}
      <TableCell className="p-1 text-right font-mono text-[10px] text-muted-foreground">
        {formatAvgCost(avgCost)}
      </TableCell>

      {/* Avg Time */}
      <TableCell className="p-1 text-right font-mono text-[10px] text-muted-foreground">
        {formatResponseTime(avgTime)}
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

        {/* Row 4: Schema-driven input defaults */}
        <SchemaEditor
          schema={(formData.capabilities as any)?.input_schema || null}
          inputDefaults={formData.input_defaults || {}}
          onInputDefaultsChange={(defaults) => set('input_defaults', defaults)}
          onSchemaChange={(schema) => set('capabilities', { ...formData.capabilities, input_schema: schema })}
        />

        {/* Row 5: Capabilities editor */}
        <CapabilitiesEditor
          capabilities={formData.capabilities || {}}
          onChange={(caps) => set('capabilities', caps)}
        />

        {/* Row 6: Toggles + actions */}
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
