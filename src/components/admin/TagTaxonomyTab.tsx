import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Trash2, ChevronDown, GripVertical, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TagPresetRow {
  id: string;
  category: string;
  group_key: string;
  group_label: string;
  tag_value: string;
  sort_order: number;
  is_active: boolean;
}

export function TagTaxonomyTab() {
  const queryClient = useQueryClient();
  const [newCategory, setNewCategory] = useState('');
  const [newGroupKey, setNewGroupKey] = useState('');
  const [newGroupLabel, setNewGroupLabel] = useState('');
  const [newTagValue, setNewTagValue] = useState('');
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null);
  const [quickAddValue, setQuickAddValue] = useState('');

  const { data: presets = [], isLoading } = useQuery({
    queryKey: ['admin-tag-presets'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('tag_presets')
        .select('*')
        .order('category')
        .order('group_key')
        .order('sort_order');
      if (error) throw error;
      return data as TagPresetRow[];
    },
  });

  const addPreset = useMutation({
    mutationFn: async (preset: { category: string; group_key: string; group_label: string; tag_value: string; sort_order: number }) => {
      const { error } = await (supabase as any)
        .from('tag_presets')
        .insert(preset);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tag-presets'] });
      queryClient.invalidateQueries({ queryKey: ['tag-presets'] });
      toast.success('Tag preset added');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deletePreset = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('tag_presets')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tag-presets'] });
      queryClient.invalidateQueries({ queryKey: ['tag-presets'] });
      toast.success('Tag preset removed');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from('tag_presets')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tag-presets'] });
      queryClient.invalidateQueries({ queryKey: ['tag-presets'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Group presets by category > group_key
  const grouped = new Map<string, Map<string, TagPresetRow[]>>();
  for (const p of presets) {
    if (!grouped.has(p.category)) grouped.set(p.category, new Map());
    const groups = grouped.get(p.category)!;
    if (!groups.has(p.group_key)) groups.set(p.group_key, []);
    groups.get(p.group_key)!.push(p);
  }

  const handleQuickAdd = (category: string, groupKey: string, groupLabel: string) => {
    const value = quickAddValue.trim().toLowerCase();
    if (!value) return;
    const existingTags = presets.filter(p => p.category === category && p.group_key === groupKey);
    const maxOrder = existingTags.length > 0 ? Math.max(...existingTags.map(t => t.sort_order)) + 1 : 0;
    addPreset.mutate({ category, group_key: groupKey, group_label: groupLabel, tag_value: value, sort_order: maxOrder });
    setQuickAddValue('');
    setAddingToGroup(null);
  };

  const handleAddNewGroup = () => {
    if (!newCategory || !newGroupKey || !newGroupLabel || !newTagValue) {
      toast.error('Fill in all fields');
      return;
    }
    addPreset.mutate({
      category: newCategory.toLowerCase(),
      group_key: newGroupKey,
      group_label: newGroupLabel,
      tag_value: newTagValue.toLowerCase(),
      sort_order: 0,
    });
    setNewCategory('');
    setNewGroupKey('');
    setNewGroupLabel('');
    setNewTagValue('');
  };

  if (isLoading) return <div className="p-4 text-muted-foreground">Loading tag taxonomy...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tag Taxonomy</h2>
          <p className="text-sm text-muted-foreground">Manage tag presets that appear in the tag picker across the app.</p>
        </div>
        <Badge variant="secondary">{presets.length} presets</Badge>
      </div>

      {/* Existing categories */}
      {Array.from(grouped.entries()).map(([category, groups]) => (
        <Card key={category}>
          <CardHeader className="py-3">
            <CardTitle className="text-sm capitalize">{category}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from(groups.entries()).map(([groupKey, tags]) => {
              const groupLabel = tags[0]?.group_label || groupKey;
              const addKey = `${category}_${groupKey}`;
              return (
                <Collapsible key={groupKey} defaultOpen>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full text-xs font-medium text-muted-foreground uppercase tracking-wider py-1 hover:text-foreground">
                    <ChevronDown className="w-3 h-3" />
                    {groupLabel}
                    <span className="text-[10px] ml-auto font-normal normal-case">{tags.length} tags</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="flex flex-wrap gap-1.5 py-1">
                      {tags.map(tag => (
                        <div
                          key={tag.id}
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors",
                            tag.is_active
                              ? "bg-primary/10 text-primary border-primary/20"
                              : "bg-muted text-muted-foreground border-border opacity-50"
                          )}
                        >
                          <span>{tag.tag_value}</span>
                          <button
                            onClick={() => toggleActive.mutate({ id: tag.id, is_active: !tag.is_active })}
                            className="hover:text-foreground"
                            title={tag.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {tag.is_active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={() => deletePreset.mutate(tag.id)}
                            className="hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    {addingToGroup === addKey ? (
                      <div className="flex gap-1 mt-1">
                        <Input
                          value={quickAddValue}
                          onChange={(e) => setQuickAddValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd(category, groupKey, groupLabel)}
                          placeholder="New tag value..."
                          className="h-7 text-xs"
                          autoFocus
                        />
                        <Button size="sm" className="h-7" onClick={() => handleQuickAdd(category, groupKey, groupLabel)}>Add</Button>
                        <Button size="sm" variant="ghost" className="h-7" onClick={() => setAddingToGroup(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs mt-1"
                        onClick={() => { setAddingToGroup(addKey); setQuickAddValue(''); }}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add tag
                      </Button>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {/* Add new group */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Add New Group</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Category (e.g. position)" className="h-8 text-xs" />
            <Input value={newGroupKey} onChange={(e) => setNewGroupKey(e.target.value)} placeholder="Group key (e.g. body)" className="h-8 text-xs" />
            <Input value={newGroupLabel} onChange={(e) => setNewGroupLabel(e.target.value)} placeholder="Group label (e.g. Body)" className="h-8 text-xs" />
            <Input value={newTagValue} onChange={(e) => setNewTagValue(e.target.value)} placeholder="First tag value" className="h-8 text-xs" />
          </div>
          <Button size="sm" className="mt-2" onClick={handleAddNewGroup}>
            <Plus className="w-3 h-3 mr-1" /> Create Group
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
