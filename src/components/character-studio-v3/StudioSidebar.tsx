import React, { useState, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ChevronDown, Loader2, Sparkles, Upload, Library, X, User, Undo2, Eraser
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CharacterData } from '@/hooks/useCharacterStudio';
import { SuggestButton, SuggestionType } from '@/components/character-studio/SuggestButton';
import { ModelSelector } from '@/components/character-studio/ModelSelector';
import { ImageModelOption } from '@/hooks/useImageModels';
import { useRoleplayModels } from '@/hooks/useRoleplayModels';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface StudioSidebarProps {
  character: CharacterData;
  updateCharacter: (updates: Partial<CharacterData>) => void;
  isNewCharacter: boolean;
  isDirty: boolean;
  isSaving: boolean;
  isGenerating: boolean;
  selectedImageModel: string;
  onImageModelChange: (id: string) => void;
  imageModelOptions: ImageModelOption[];
  onOpenImagePicker: () => void;
  onSave: () => Promise<string | null>;
  primaryPortraitUrl?: string | null;
  entryMode?: string | null;
  onClearSuggestions?: () => void;
}

export function StudioSidebar({
  character, updateCharacter, isNewCharacter, isDirty, isSaving, isGenerating,
  selectedImageModel, onImageModelChange, imageModelOptions, onOpenImagePicker,
  onSave, primaryPortraitUrl, entryMode, onClearSuggestions,
}: StudioSidebarProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [openSections, setOpenSections] = useState({
    basic: true,
    appearance: true,
    personality: false,
    advanced: false,
  });

  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState<SuggestionType | null>(null);
  const [newTag, setNewTag] = useState('');
  const [isUploadingRef, setIsUploadingRef] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const preSuggestionSnapshot = useRef<Partial<CharacterData> | null>(null);

  const { allModelOptions: roleplayModels, defaultModel: defaultRoleplayModel } = useRoleplayModels();
  const [selectedRoleplayModel, setSelectedRoleplayModel] = useState('');

  const toggle = (s: keyof typeof openSections) => setOpenSections(p => ({ ...p, [s]: !p[s] }));

  // Tag management
  const addTag = () => {
    const tag = newTag.trim();
    if (tag && !character.appearance_tags.includes(tag)) {
      updateCharacter({ appearance_tags: [...character.appearance_tags, tag] });
      setNewTag('');
    }
  };
  const removeTag = (tag: string) => updateCharacter({ appearance_tags: character.appearance_tags.filter(t => t !== tag) });

  // Reference image upload
  const handleUploadRef = async () => {
    if (!user) return;
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setIsUploadingRef(true);
      try {
        let processed = file;
        if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
          const heic2any = (await import('heic2any')).default;
          const blob = await heic2any({ blob: file, toType: 'image/jpeg' });
          processed = new File([blob as Blob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
        }
        const path = `${user.id}/ref_${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage.from('reference_images').upload(path, processed, { upsert: true });
        if (upErr) throw upErr;
        const { data: signed, error: signErr } = await supabase.storage.from('reference_images').createSignedUrl(path, 3600);
        if (signErr) throw signErr;
        if (signed?.signedUrl) { updateCharacter({ reference_image_url: signed.signedUrl }); toast({ title: 'Reference uploaded' }); }
      } catch (err) {
        toast({ title: 'Upload failed', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
      } finally { setIsUploadingRef(false); }
    };
    input.click();
  };

  // AI Suggestions
  const fetchSuggestions = useCallback(async (type: SuggestionType) => {
    // Snapshot before applying suggestions
    preSuggestionSnapshot.current = {
      description: character.description,
      traits: character.traits,
      persona: character.persona,
      voice_tone: character.voice_tone,
      mood: character.mood,
      appearance_tags: [...character.appearance_tags],
    };
    setIsLoadingSuggestion(type);
    try {
      const { data, error } = await supabase.functions.invoke('character-suggestions', {
        body: {
          type: type === 'persona' ? 'backstory' : type,
          characterName: character.name || undefined,
          existingDescription: character.description || undefined,
          existingTraits: character.traits ? character.traits.split(',').map(t => t.trim()) : undefined,
          existingAppearance: character.appearance_tags.length > 0 ? character.appearance_tags : undefined,
          contentRating: character.content_rating,
          modelKey: selectedRoleplayModel || defaultRoleplayModel?.value || undefined,
        },
      });
      if (error) throw error;
      if (data?.success && data.suggestions) {
        const s = data.suggestions;
        if (type === 'traits' && s.suggestedTraits) { const cur = character.traits ? character.traits.split(',').map(t => t.trim()) : []; updateCharacter({ traits: [...new Set([...cur, ...s.suggestedTraits])].join(', ') }); }
        if (type === 'voice' && s.suggestedVoiceTone) updateCharacter({ voice_tone: s.suggestedVoiceTone, persona: s.suggestedPersona || character.persona });
        if (type === 'appearance' && s.suggestedAppearance) updateCharacter({ appearance_tags: [...new Set([...character.appearance_tags, ...s.suggestedAppearance])] });
        if (type === 'description' && s.suggestedDescription) updateCharacter({ description: s.suggestedDescription });
        if (type === 'persona' && s.suggestedPersona) updateCharacter({ persona: s.suggestedPersona });
        if (type === 'all') updateCharacter({ description: s.suggestedDescription || character.description, traits: s.suggestedTraits?.join(', ') || character.traits, voice_tone: s.suggestedVoiceTone || character.voice_tone, persona: s.suggestedPersona || character.persona, appearance_tags: s.suggestedAppearance || character.appearance_tags });
        setCanUndo(true);
        toast({ title: type === 'all' ? 'Character Enhanced' : 'Suggestion Applied' });
      }
    } catch {
      toast({ title: 'Suggestion Failed', variant: 'destructive' });
    } finally { setIsLoadingSuggestion(null); }
  }, [character, toast, selectedRoleplayModel, defaultRoleplayModel, updateCharacter]);

  const handleUndoSuggestion = useCallback(() => {
    if (preSuggestionSnapshot.current) {
      updateCharacter(preSuggestionSnapshot.current);
      preSuggestionSnapshot.current = null;
      setCanUndo(false);
      toast({ title: 'Suggestions Undone' });
    }
  }, [updateCharacter, toast]);

  return (
    <div className="h-full flex flex-col bg-card border-r border-border">
      <ScrollArea className="flex-1 overflow-x-hidden">
        <div className="p-3 space-y-3 pb-6">
          {/* Avatar + Name Row */}
          <div className="flex items-center gap-2.5 pb-3 border-b border-border">
            <div className="w-11 h-11 rounded-full overflow-hidden bg-muted border border-border relative flex-shrink-0">
              {isGenerating && <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>}
              {primaryPortraitUrl || character.image_url ? (
                <img src={primaryPortraitUrl || character.image_url || ''} alt={character.name || 'Character'} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><User className="w-5 h-5 text-muted-foreground" /></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-foreground block truncate">{character.name || 'New Character'}</span>
              <div className="flex items-center gap-1 mt-0.5">
                <SuggestButton type="all" onClick={() => fetchSuggestions('all')} isLoading={isLoadingSuggestion !== null} loadingType={isLoadingSuggestion} disabled={!character.name} variant="text" />
                {canUndo && (
                  <button onClick={handleUndoSuggestion} className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5 transition-colors">
                    <Undo2 className="w-2.5 h-2.5" />Undo
                  </button>
                )}
                {onClearSuggestions && (
                  <button onClick={() => { onClearSuggestions(); setCanUndo(false); preSuggestionSnapshot.current = null; }} className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-0.5 transition-colors">
                    <Eraser className="w-2.5 h-2.5" />Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* BASIC INFO */}
          <Collapsible open={openSections.basic} onOpenChange={() => toggle('basic')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-1 text-xs font-medium text-foreground hover:text-primary transition-colors">
              Basic Info
              <ChevronDown className={cn('w-3 h-3 transition-transform', openSections.basic && 'rotate-180')} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-1.5">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Name</Label>
                <Input value={character.name} onChange={e => updateCharacter({ name: e.target.value })} placeholder="Character name" className="h-7" />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Gender</Label>
                  <Select value={character.gender} onValueChange={v => updateCharacter({ gender: v })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="z-[100] bg-popover">
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="non-binary">Non-binary</SelectItem>
                      <SelectItem value="unspecified">Unspecified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Rating</Label>
                  <Select value={character.content_rating} onValueChange={(v: 'sfw' | 'nsfw') => updateCharacter({ content_rating: v })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="z-[100] bg-popover">
                      <SelectItem value="sfw">SFW</SelectItem>
                      <SelectItem value="nsfw">NSFW</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-muted-foreground">Description</Label>
                  <SuggestButton type="description" onClick={() => fetchSuggestions('description')} isLoading={isLoadingSuggestion !== null} loadingType={isLoadingSuggestion} disabled={!character.name} variant="text" />
                </div>
                <Textarea value={character.description} onChange={e => updateCharacter({ description: e.target.value })} placeholder="Brief character description..." className="min-h-[48px] resize-none" />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* APPEARANCE */}
          <Collapsible open={openSections.appearance} onOpenChange={() => toggle('appearance')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-1 text-xs font-medium text-foreground hover:text-primary transition-colors">
              Appearance
              <ChevronDown className={cn('w-3 h-3 transition-transform', openSections.appearance && 'rotate-180')} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-1.5">
              {/* Visual Description */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-muted-foreground">Visual Description</Label>
                  <SuggestButton type="traits" onClick={() => fetchSuggestions('traits')} isLoading={isLoadingSuggestion !== null} loadingType={isLoadingSuggestion} disabled={!character.name} variant="text" />
                </div>
                <Textarea value={character.traits} onChange={e => updateCharacter({ traits: e.target.value })} placeholder="auburn hair, green eyes, athletic build, leather jacket..." className="min-h-[48px] resize-none" />
              </div>

              {/* Tags */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-muted-foreground">Tags</Label>
                  <SuggestButton type="appearance" onClick={() => fetchSuggestions('appearance')} isLoading={isLoadingSuggestion !== null} loadingType={isLoadingSuggestion} disabled={!character.name} variant="text" />
                </div>
                <div className="flex gap-1 flex-wrap">
                  {character.appearance_tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[10px] h-5 gap-0.5 px-1.5">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="ml-0.5 hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-1">
                  <Input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Add tag..." className="h-6 text-[10px] flex-1" />
                  <Button variant="ghost" size="sm" onClick={addTag} disabled={!newTag.trim()} className="h-6 px-1.5 text-[10px]">+</Button>
                </div>
              </div>

              {/* Reference Image */}
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Style Lock</Label>
                <span className="text-[9px] text-muted-foreground">Portraits will match this face/style</span>
                {character.reference_image_url ? (
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-12 rounded overflow-hidden border border-border flex-shrink-0">
                      <img src={character.reference_image_url} alt="Reference" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Badge variant="secondary" className="text-[10px] h-4 px-1 mb-1">Style Locked</Badge>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-5 px-1 text-[10px]" onClick={handleUploadRef}>Replace</Button>
                        <Button variant="ghost" size="sm" className="h-5 px-1 text-[10px] text-destructive" onClick={() => updateCharacter({ reference_image_url: null })}>Remove</Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 flex-1" onClick={handleUploadRef} disabled={isUploadingRef}>
                      {isUploadingRef ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}Upload
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 flex-1" onClick={onOpenImagePicker}>
                      <Library className="w-3 h-3" />Library
                    </Button>
                  </div>
                )}
              </div>

              {/* Model + Generate */}
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground">Image Model</Label>
                <ModelSelector models={imageModelOptions} selectedModel={selectedImageModel} onSelect={onImageModelChange} isLoading={false} hasReferenceImage={!!character.reference_image_url} size="sm" />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* PERSONALITY & VOICE */}
          <Collapsible open={openSections.personality} onOpenChange={() => toggle('personality')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-1 text-xs font-medium text-foreground hover:text-primary transition-colors">
              Personality & Voice
              <ChevronDown className={cn('w-3 h-3 transition-transform', openSections.personality && 'rotate-180')} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-1.5">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-muted-foreground">Persona / Backstory</Label>
                  <SuggestButton type="persona" onClick={() => fetchSuggestions('persona')} isLoading={isLoadingSuggestion !== null} loadingType={isLoadingSuggestion} disabled={!character.name} variant="text" />
                </div>
                <Textarea value={character.persona} onChange={e => updateCharacter({ persona: e.target.value })} placeholder="Character's background, motivations..." className="min-h-[48px] resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Voice Tone</Label>
                  <Input value={character.voice_tone} onChange={e => updateCharacter({ voice_tone: e.target.value })} placeholder="warm, playful..." className="h-7 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Mood</Label>
                  <Input value={character.mood} onChange={e => updateCharacter({ mood: e.target.value })} placeholder="friendly, mysterious..." className="h-7 text-xs" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">First Message</Label>
                <Textarea value={character.first_message} onChange={e => updateCharacter({ first_message: e.target.value })} placeholder="Opening message when chat starts..." className="min-h-[48px] resize-none" />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* ADVANCED */}
          <Collapsible open={openSections.advanced} onOpenChange={() => toggle('advanced')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-1 text-xs font-medium text-foreground hover:text-primary transition-colors">
              Advanced
              <ChevronDown className={cn('w-3 h-3 transition-transform', openSections.advanced && 'rotate-180')} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] text-muted-foreground">Public</Label>
                <Switch checked={character.is_public} onCheckedChange={v => updateCharacter({ is_public: v })} className="scale-75" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">System Prompt</Label>
                <Textarea value={character.system_prompt} onChange={e => updateCharacter({ system_prompt: e.target.value })} placeholder="Foundational AI instructions..." className="min-h-[60px] resize-none font-mono text-[10px]" />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
}
