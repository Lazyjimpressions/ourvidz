import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronDown, 
  User, 
  Palette, 
  MessageSquare,
  Settings,
  Wand2,
  Loader2,
  Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CharacterData } from '@/hooks/useCharacterStudio';
import { PresetChipCarousel } from '@/components/roleplay/PresetChipCarousel';

interface CharacterStudioSidebarProps {
  character: CharacterData;
  onUpdateCharacter: (updates: Partial<CharacterData>) => void;
  onSave: () => Promise<string | null>;
  onGenerate: (prompt: string) => Promise<string | null>;
  isSaving: boolean;
  isGenerating: boolean;
  isDirty: boolean;
  isNewCharacter: boolean;
  primaryPortraitUrl?: string | null;
}

export function CharacterStudioSidebar({
  character,
  onUpdateCharacter,
  onSave,
  onGenerate,
  isSaving,
  isGenerating,
  isDirty,
  isNewCharacter,
  primaryPortraitUrl
}: CharacterStudioSidebarProps) {
  const [openSections, setOpenSections] = React.useState({
    basic: true,
    appearance: true,
    personality: false,
    advanced: false
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Build appearance prompt from character data
  const buildAppearancePrompt = () => {
    const parts: string[] = [];
    
    if (character.name) parts.push(character.name);
    if (character.gender) parts.push(character.gender);
    if (character.appearance_tags.length > 0) {
      parts.push(character.appearance_tags.join(', '));
    }
    if (character.traits) parts.push(character.traits);
    
    return parts.join(', ') || 'beautiful woman, portrait';
  };

  const handleGeneratePortrait = () => {
    const prompt = buildAppearancePrompt();
    onGenerate(prompt);
  };

  const handlePresetSelect = (presetPrompt: string) => {
    // Extract tags from preset and add to appearance_tags
    const newTags = presetPrompt.split(',').map(t => t.trim()).filter(Boolean);
    const updatedTags = [...new Set([...character.appearance_tags, ...newTags])];
    onUpdateCharacter({ appearance_tags: updatedTags });
  };

  return (
    <div className="h-full flex flex-col bg-card border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Character Details</h2>
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving || !isDirty}
          className="gap-1.5"
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          {isNewCharacter ? 'Create' : 'Save'}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Character Avatar Preview */}
          <div className="flex flex-col items-center gap-3 pb-4 border-b border-border">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-muted border-2 border-border">
              {primaryPortraitUrl || character.image_url ? (
                <img 
                  src={primaryPortraitUrl || character.image_url || ''} 
                  alt={character.name || 'Character'} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
            </div>
            <span className="text-sm font-medium text-foreground">
              {character.name || 'New Character'}
            </span>
          </div>

          {/* Basic Info Section */}
          <Collapsible open={openSections.basic} onOpenChange={() => toggleSection('basic')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Basic Info
              </div>
              <ChevronDown className={cn('w-4 h-4 transition-transform', openSections.basic && 'rotate-180')} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs text-muted-foreground">Name</Label>
                <Input
                  id="name"
                  value={character.name}
                  onChange={(e) => onUpdateCharacter({ name: e.target.value })}
                  placeholder="Character name"
                  className="h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Gender</Label>
                  <Select 
                    value={character.gender} 
                    onValueChange={(value) => onUpdateCharacter({ gender: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="non-binary">Non-binary</SelectItem>
                      <SelectItem value="unspecified">Unspecified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Rating</Label>
                  <Select 
                    value={character.content_rating} 
                    onValueChange={(value: 'sfw' | 'nsfw') => onUpdateCharacter({ content_rating: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sfw">SFW</SelectItem>
                      <SelectItem value="nsfw">NSFW</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs text-muted-foreground">Description</Label>
                <Textarea
                  id="description"
                  value={character.description}
                  onChange={(e) => onUpdateCharacter({ description: e.target.value })}
                  placeholder="Brief character description..."
                  className="min-h-[60px] resize-none text-sm"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Appearance Section */}
          <Collapsible open={openSections.appearance} onOpenChange={() => toggleSection('appearance')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Appearance
              </div>
              <ChevronDown className={cn('w-4 h-4 transition-transform', openSections.appearance && 'rotate-180')} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              {/* Appearance Presets */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Quick Presets</Label>
                <PresetChipCarousel onPresetSelect={handlePresetSelect} />
              </div>

              {/* Appearance Tags */}
              <div className="space-y-1.5">
                <Label htmlFor="traits" className="text-xs text-muted-foreground">Appearance Details</Label>
                <Textarea
                  id="traits"
                  value={character.traits}
                  onChange={(e) => onUpdateCharacter({ traits: e.target.value })}
                  placeholder="blonde hair, blue eyes, athletic build..."
                  className="min-h-[60px] resize-none text-sm"
                />
              </div>

              {/* Current Tags */}
              {character.appearance_tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {character.appearance_tags.map((tag, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="text-xs cursor-pointer hover:bg-destructive/20"
                      onClick={() => {
                        const newTags = character.appearance_tags.filter((_, i) => i !== index);
                        onUpdateCharacter({ appearance_tags: newTags });
                      }}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              )}

              {/* Generate Button */}
              <Button
                onClick={handleGeneratePortrait}
                disabled={isGenerating}
                className="w-full gap-2"
                variant="secondary"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                {isGenerating ? 'Generating...' : 'Generate Portrait'}
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Personality Section */}
          <Collapsible open={openSections.personality} onOpenChange={() => toggleSection('personality')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Personality & Voice
              </div>
              <ChevronDown className={cn('w-4 h-4 transition-transform', openSections.personality && 'rotate-180')} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="persona" className="text-xs text-muted-foreground">Persona</Label>
                <Textarea
                  id="persona"
                  value={character.persona}
                  onChange={(e) => onUpdateCharacter({ persona: e.target.value })}
                  placeholder="Character's personality, background, motivations..."
                  className="min-h-[80px] resize-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Voice Tone</Label>
                  <Select 
                    value={character.voice_tone} 
                    onValueChange={(value) => onUpdateCharacter({ voice_tone: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warm">Warm</SelectItem>
                      <SelectItem value="playful">Playful</SelectItem>
                      <SelectItem value="confident">Confident</SelectItem>
                      <SelectItem value="teasing">Teasing</SelectItem>
                      <SelectItem value="direct">Direct</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Mood</Label>
                  <Select 
                    value={character.mood} 
                    onValueChange={(value) => onUpdateCharacter({ mood: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="flirty">Flirty</SelectItem>
                      <SelectItem value="mysterious">Mysterious</SelectItem>
                      <SelectItem value="dominant">Dominant</SelectItem>
                      <SelectItem value="submissive">Submissive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="first_message" className="text-xs text-muted-foreground">First Message</Label>
                <Textarea
                  id="first_message"
                  value={character.first_message}
                  onChange={(e) => onUpdateCharacter({ first_message: e.target.value })}
                  placeholder="The character's opening message when starting a conversation..."
                  className="min-h-[80px] resize-none text-sm"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Advanced Section */}
          <Collapsible open={openSections.advanced} onOpenChange={() => toggleSection('advanced')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Advanced
              </div>
              <ChevronDown className={cn('w-4 h-4 transition-transform', openSections.advanced && 'rotate-180')} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label className="text-sm">Make Public</Label>
                  <p className="text-xs text-muted-foreground">Allow others to chat with this character</p>
                </div>
                <Switch 
                  checked={character.is_public} 
                  onCheckedChange={(checked) => onUpdateCharacter({ is_public: checked })} 
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="system_prompt" className="text-xs text-muted-foreground">System Prompt</Label>
                <Textarea
                  id="system_prompt"
                  value={character.system_prompt}
                  onChange={(e) => onUpdateCharacter({ system_prompt: e.target.value })}
                  placeholder="Advanced instructions for the AI..."
                  className="min-h-[100px] resize-none text-sm font-mono text-xs"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
}
