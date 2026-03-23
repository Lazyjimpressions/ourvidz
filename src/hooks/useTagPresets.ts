import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ALL_TAG_CATEGORIES, FILTER_TAG_VOCABULARY as HARDCODED_FILTER_VOCAB } from '@/types/positionTags';

export interface TagPreset {
  id: string;
  category: string;
  group_key: string;
  group_label: string;
  tag_value: string;
  sort_order: number;
}

export interface TagGroup {
  label: string;
  tags: string[];
}

export interface TagCategory {
  category: string;
  key: string;
  groups: Record<string, TagGroup>;
}

/** Transform flat preset rows into grouped category structure */
function buildCategories(presets: TagPreset[]): TagCategory[] {
  const catMap = new Map<string, Map<string, { label: string; tags: { value: string; order: number }[] }>>();

  for (const p of presets) {
    if (!catMap.has(p.category)) catMap.set(p.category, new Map());
    const groups = catMap.get(p.category)!;
    if (!groups.has(p.group_key)) groups.set(p.group_key, { label: p.group_label, tags: [] });
    groups.get(p.group_key)!.tags.push({ value: p.tag_value, order: p.sort_order });
  }

  const categoryOrder = ['position', 'clothing', 'scene', 'style'];
  const result: TagCategory[] = [];

  for (const catKey of categoryOrder) {
    const groups = catMap.get(catKey);
    if (!groups) continue;
    const groupObj: Record<string, TagGroup> = {};
    for (const [gk, gv] of groups) {
      gv.tags.sort((a, b) => a.order - b.order);
      groupObj[gk] = { label: gv.label, tags: gv.tags.map(t => t.value) };
    }
    result.push({
      category: catKey.charAt(0).toUpperCase() + catKey.slice(1),
      key: catKey,
      groups: groupObj,
    });
  }

  // Any categories not in the order
  for (const [catKey, groups] of catMap) {
    if (categoryOrder.includes(catKey)) continue;
    const groupObj: Record<string, TagGroup> = {};
    for (const [gk, gv] of groups) {
      gv.tags.sort((a, b) => a.order - b.order);
      groupObj[gk] = { label: gv.label, tags: gv.tags.map(t => t.value) };
    }
    result.push({
      category: catKey.charAt(0).toUpperCase() + catKey.slice(1),
      key: catKey,
      groups: groupObj,
    });
  }

  return result;
}

/** Build filter vocabulary from categories */
function buildFilterVocabulary(categories: TagCategory[]): Record<string, string[]> {
  const vocab: Record<string, string[]> = {};
  for (const cat of categories) {
    const allTags = Object.values(cat.groups).flatMap(g => g.tags);
    vocab[cat.key] = allTags;
  }
  // character filter uses position's framing + angle
  const positionCat = categories.find(c => c.key === 'position');
  if (positionCat) {
    vocab['character'] = [
      ...(positionCat.groups['framing']?.tags || []),
      ...(positionCat.groups['angle']?.tags || []),
    ];
  }
  return vocab;
}

/** Hardcoded fallback */
function getFallbackCategories(): TagCategory[] {
  return ALL_TAG_CATEGORIES.map(c => ({
    category: c.category,
    key: c.key,
    groups: Object.fromEntries(
      Object.entries(c.groups).map(([k, v]) => [k, { label: v.label, tags: [...v.tags] }])
    ),
  }));
}

export function useTagPresets() {
  const query = useQuery({
    queryKey: ['tag-presets'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('tag_presets')
        .select('id, category, group_key, group_label, tag_value, sort_order')
        .eq('is_active', true)
        .order('category')
        .order('group_key')
        .order('sort_order');
      if (error) throw error;
      return data as TagPreset[];
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
    retry: 1,
  });

  const categories = query.data && query.data.length > 0
    ? buildCategories(query.data)
    : getFallbackCategories();

  const filterVocabulary = query.data && query.data.length > 0
    ? buildFilterVocabulary(categories)
    : HARDCODED_FILTER_VOCAB;

  return {
    categories,
    filterVocabulary,
    presets: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
