import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Image as ImageIcon, Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PortraitGallery } from '@/components/character-studio/PortraitGallery';
import { ScenesGallery } from '@/components/character-studio/ScenesGallery';
import { PosePresets } from '@/components/character-studio/PosePresets';
import { CharacterStudioPromptBar } from '@/components/character-studio/CharacterStudioPromptBar';
import { CharacterPortrait } from '@/hooks/usePortraitVersions';
import { CharacterData, CharacterScene } from '@/hooks/useCharacterStudio';
import { ImageModelOption } from '@/hooks/useImageModels';

interface StudioWorkspaceProps {
  portraits: CharacterPortrait[];
  primaryPortrait: CharacterPortrait | null | undefined;
  setPrimaryPortrait: (id: string) => void;
  deletePortrait: (id: string) => void;
  scenes: CharacterScene[];
  isGenerating: boolean;
  generationProgress: { percent: number; estimatedTimeRemaining: number; stage: 'queued' | 'processing' | 'finalizing' } | null;
  isNewCharacter: boolean;
  selectedItemId: string | null;
  selectedItemType: 'portrait' | 'scene' | null;
  selectItem: (id: string | null, type: 'portrait' | 'scene' | null) => void;
  character: CharacterData;
  updateCharacter: (u: Partial<CharacterData>) => void;
  selectedImageModel: string;
  onImageModelChange: (id: string) => void;
  imageModelOptions: ImageModelOption[];
  onOpenImagePicker: () => void;
  onGenerate: (prompt: string, refUrl?: string, modelId?: string) => void;
  promptText: string;
  setPromptText: (v: string) => void;
  onUseAsReference: (p: { image_url: string }) => void;
  onEditScene: (s: CharacterScene) => void;
  onDeleteScene: (id: string) => void;
  onAddScene: () => void;
  onStartChatWithScene: (s: CharacterScene) => void;
  workspaceTab: 'portraits' | 'scenes';
  setWorkspaceTab: (t: 'portraits' | 'scenes') => void;
  characterAppearanceTags: string[];
  onRegenerate: (prompt: string, refUrl: string) => void;
  onEnhancePrompt?: (prompt: string, modelId: string) => Promise<string | null>;
  mobileMode?: boolean;
  scenesOnly?: boolean;
}

export function StudioWorkspace({
  portraits, primaryPortrait, setPrimaryPortrait, deletePortrait,
  scenes, isGenerating, generationProgress, isNewCharacter,
  selectedItemId, selectedItemType, selectItem, character, updateCharacter,
  selectedImageModel, onImageModelChange, imageModelOptions, onOpenImagePicker,
  onGenerate, promptText, setPromptText, onUseAsReference,
  onEditScene, onDeleteScene, onAddScene, onStartChatWithScene,
  workspaceTab, setWorkspaceTab, characterAppearanceTags, onRegenerate,
  onEnhancePrompt, mobileMode, scenesOnly,
}: StudioWorkspaceProps) {

  // Scenes-only mode for mobile scenes tab
  if (scenesOnly) {
    return (
      <ScenesGallery
        scenes={scenes}
        selectedSceneId={selectedItemType === 'scene' ? selectedItemId : null}
        isNewCharacter={isNewCharacter}
        onSelect={id => selectItem(id, 'scene')}
        onEdit={onEditScene}
        onDelete={onDeleteScene}
        onAddNew={onAddScene}
        onStartChat={onStartChatWithScene}
      />
    );
  }

  // Mobile portraits mode: gallery + prompt bar
  if (mobileMode) {
    return (
      <div className="flex flex-col h-full">
        <ScrollArea className="flex-1">
          <div className="p-3 pb-2 space-y-2">
            <PosePresets onSelect={p => setPromptText(promptText ? `${promptText}, ${p}` : p)} compact />
            <PortraitGallery
              portraits={portraits}
              primaryPortraitId={primaryPortrait?.id}
              selectedPortraitId={selectedItemType === 'portrait' ? selectedItemId : null}
              isGenerating={isGenerating}
              isNewCharacter={isNewCharacter}
              onSelect={id => selectItem(id, 'portrait')}
              onSetPrimary={setPrimaryPortrait}
              onDelete={deletePortrait}
              onAddNew={() => onGenerate(promptText || character.traits || character.name || 'portrait', character.reference_image_url || undefined, selectedImageModel)}
              onUseAsReference={onUseAsReference}
              onRegenerate={onRegenerate}
              characterAppearanceTags={characterAppearanceTags}
            />
          </div>
        </ScrollArea>
        <CharacterStudioPromptBar
          onGenerate={onGenerate}
          isGenerating={isGenerating}
          generationProgress={generationProgress}
          isDisabled={false}
          placeholder={`Describe a portrait for ${character.name || 'your character'}...`}
          selectedImageModel={selectedImageModel}
          onImageModelChange={onImageModelChange}
          imageModelOptions={imageModelOptions}
          onOpenImagePicker={onOpenImagePicker}
          referenceImageUrl={character.reference_image_url}
          onReferenceImageChange={url => updateCharacter({ reference_image_url: url })}
          value={promptText}
          onValueChange={setPromptText}
          onEnhancePrompt={onEnhancePrompt}
        />
      </div>
    );
  }

  // Desktop: tabbed workspace
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center border-b border-border bg-card px-4">
        <button
          onClick={() => setWorkspaceTab('portraits')}
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors border-b-2 -mb-px',
            workspaceTab === 'portraits' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'
          )}
        >
          <ImageIcon className="w-3 h-3" />
          Portraits
          {portraits.length > 0 && <Badge variant="secondary" className="ml-1 h-3.5 px-1 text-[9px]">{portraits.length}</Badge>}
        </button>
        <button
          onClick={() => setWorkspaceTab('scenes')}
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors border-b-2 -mb-px',
            workspaceTab === 'scenes' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'
          )}
        >
          <Film className="w-3 h-3" />
          Scenes
          {scenes.length > 0 && <Badge variant="secondary" className="ml-1 h-3.5 px-1 text-[9px]">{scenes.length}</Badge>}
        </button>
      </div>

      {/* Content */}
      {workspaceTab === 'portraits' ? (
        <>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3 max-w-6xl">
              <PosePresets onSelect={p => setPromptText(promptText ? `${promptText}, ${p}` : p)} compact />
              <PortraitGallery
                portraits={portraits}
                primaryPortraitId={primaryPortrait?.id}
                selectedPortraitId={selectedItemType === 'portrait' ? selectedItemId : null}
                isGenerating={isGenerating}
                isNewCharacter={isNewCharacter}
                onSelect={id => selectItem(id, 'portrait')}
                onSetPrimary={setPrimaryPortrait}
                onDelete={deletePortrait}
                onAddNew={() => onGenerate(promptText || character.traits || character.name || 'portrait', character.reference_image_url || undefined, selectedImageModel)}
                onUseAsReference={onUseAsReference}
                onRegenerate={onRegenerate}
                characterAppearanceTags={characterAppearanceTags}
              />
            </div>
          </ScrollArea>
          <CharacterStudioPromptBar
            onGenerate={onGenerate}
            isGenerating={isGenerating}
            generationProgress={generationProgress}
            isDisabled={false}
            placeholder={`Describe a portrait for ${character.name || 'your character'}...`}
            selectedImageModel={selectedImageModel}
            onImageModelChange={onImageModelChange}
            imageModelOptions={imageModelOptions}
            onOpenImagePicker={onOpenImagePicker}
            referenceImageUrl={character.reference_image_url}
            onReferenceImageChange={url => updateCharacter({ reference_image_url: url })}
            value={promptText}
            onValueChange={setPromptText}
            onEnhancePrompt={onEnhancePrompt}
          />
        </>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-4 max-w-6xl">
            <ScenesGallery
              scenes={scenes}
              selectedSceneId={selectedItemType === 'scene' ? selectedItemId : null}
              isNewCharacter={isNewCharacter}
              onSelect={id => selectItem(id, 'scene')}
              onEdit={onEditScene}
              onDelete={onDeleteScene}
              onAddNew={onAddScene}
              onStartChat={onStartChatWithScene}
            />
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
