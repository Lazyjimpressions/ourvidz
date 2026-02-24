import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Image as ImageIcon, Film, Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { urlSigningService } from '@/lib/services/UrlSigningService';
import { PortraitGallery } from '@/components/character-studio/PortraitGallery';
import { ScenesGallery } from '@/components/character-studio/ScenesGallery';
import { PosePresets } from '@/components/character-studio/PosePresets';
import { CharacterStudioPromptBar } from '@/components/character-studio/CharacterStudioPromptBar';
import { PositionsGrid } from '@/components/character-studio-v3/PositionsGrid';
import { CharacterPortrait } from '@/hooks/usePortraitVersions';
import { CharacterData, CharacterScene, CharacterCanon, CanonPosePreset } from '@/hooks/useCharacterStudio';
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
  onOpenImagePicker: (source?: 'workspace' | 'library') => void;
  onGenerate: (prompt: string, refUrl?: string, modelId?: string, numImages?: number) => void;
  promptText: string;
  setPromptText: (v: string) => void;
  onUseAsReference: (p: { image_url: string }) => void;
  onEditScene: (s: CharacterScene) => void;
  onDeleteScene: (id: string) => void;
  onAddScene: () => void;
  onStartChatWithScene: (s: CharacterScene) => void;
  workspaceTab: 'portraits' | 'positions' | 'scenes';
  setWorkspaceTab: (t: 'portraits' | 'positions' | 'scenes') => void;
  characterAppearanceTags: string[];
  onRegenerate: (prompt: string, refUrl: string) => void;
  onEnhancePrompt?: (prompt: string, modelId: string) => Promise<string | null>;
  onCopyPrompt?: (prompt: string) => void;
  characterData?: { name: string; gender: string; traits: string; appearance_tags: string[] };
  mobileMode?: boolean;
  scenesOnly?: boolean;
  positionsOnly?: boolean;
  referenceStrength?: number;
  // Canon props
  canonImages?: CharacterCanon[];
  isCanonUploading?: boolean;
  onCanonUpload?: (file: File, outputType: string, tags: string[], label?: string) => Promise<void>;
  onCanonDelete?: (id: string) => void;
  onCanonSetPrimary?: (id: string) => void;
  onCanonUpdateTags?: (id: string, tags: string[]) => void;
  onSaveAsPosition?: (imageUrl: string) => void;
  onAssignCanonPoseKey?: (canonId: string, poseKey: string) => void;
  // Canon position generation
  canonPosePresets?: Record<string, CanonPosePreset>;
  onGeneratePosition?: (poseKey: string) => Promise<string | null>;
  generatingPoseKey?: string | null;
  hasReferenceImage?: boolean;
  onUpdatePresetPrompt?: (poseKey: string, newFragment: string) => Promise<void>;
}

export function StudioWorkspace({
  portraits, primaryPortrait, setPrimaryPortrait, deletePortrait,
  scenes, isGenerating, generationProgress, isNewCharacter,
  selectedItemId, selectedItemType, selectItem, character, updateCharacter,
  selectedImageModel, onImageModelChange, imageModelOptions, onOpenImagePicker,
  onGenerate, promptText, setPromptText, onUseAsReference,
  onEditScene, onDeleteScene, onAddScene, onStartChatWithScene,
  workspaceTab, setWorkspaceTab, characterAppearanceTags, onRegenerate,
  onEnhancePrompt, onCopyPrompt, characterData, mobileMode, scenesOnly, positionsOnly,
  referenceStrength,
  canonImages, isCanonUploading, onCanonUpload, onCanonDelete, onCanonSetPrimary, onCanonUpdateTags,
  onSaveAsPosition, onAssignCanonPoseKey,
  canonPosePresets, onGeneratePosition, generatingPoseKey, hasReferenceImage,
  onUpdatePresetPrompt,
}: StudioWorkspaceProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSendToWorkspace = async (imageUrl: string) => {
    try {
      let signedUrl = imageUrl;
      if (imageUrl.includes('user-library/') || imageUrl.includes('workspace-temp/') || imageUrl.includes('character-')) {
        signedUrl = await urlSigningService.getSignedUrl(imageUrl, 'user-library');
      }
      toast({ title: 'Opening workspace with reference...' });
      navigate('/workspace?mode=image', { state: { referenceUrl: signedUrl } });
    } catch {
      toast({ title: 'Failed to prepare image', variant: 'destructive' });
    }
  };

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

  // Positions-only mode for mobile positions tab
  if (positionsOnly && onCanonUpload && onCanonDelete && onCanonSetPrimary && onCanonUpdateTags) {
    return (
      <ScrollArea className="h-full">
      <PositionsGrid
          canonImages={canonImages || []}
          isNewCharacter={isNewCharacter}
          onUpload={onCanonUpload}
          onDelete={onCanonDelete}
          onSetPrimary={onCanonSetPrimary}
          onUpdateTags={onCanonUpdateTags}
          onAssignPoseKey={onAssignCanonPoseKey}
          isUploading={isCanonUploading}
          canonPosePresets={canonPosePresets}
          onGeneratePosition={onGeneratePosition}
          generatingPoseKey={generatingPoseKey}
          hasReferenceImage={hasReferenceImage}
          onUpdatePresetPrompt={onUpdatePresetPrompt}
          onSendToWorkspace={handleSendToWorkspace}
        />
      </ScrollArea>
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
              onCopyPrompt={onCopyPrompt}
              onSaveAsPosition={onSaveAsPosition}
              onSendToWorkspace={handleSendToWorkspace}
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
          characterData={characterData}
          referenceStrength={referenceStrength}
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
          onClick={() => setWorkspaceTab('positions')}
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors border-b-2 -mb-px',
            workspaceTab === 'positions' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'
          )}
        >
          <Crosshair className="w-3 h-3" />
          Positions
          {(canonImages?.length ?? 0) > 0 && <Badge variant="secondary" className="ml-1 h-3.5 px-1 text-[9px]">{canonImages!.length}</Badge>}
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
                onCopyPrompt={onCopyPrompt}
                onSaveAsPosition={onSaveAsPosition}
                onSendToWorkspace={handleSendToWorkspace}
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
            characterData={characterData}
            referenceStrength={referenceStrength}
          />
        </>
      ) : workspaceTab === 'positions' ? (
        <ScrollArea className="flex-1">
          <div className="p-4 max-w-6xl">
            {onCanonUpload && onCanonDelete && onCanonSetPrimary && onCanonUpdateTags ? (
              <PositionsGrid
                canonImages={canonImages || []}
                isNewCharacter={isNewCharacter}
                onUpload={onCanonUpload}
                onDelete={onCanonDelete}
                onSetPrimary={onCanonSetPrimary}
                onUpdateTags={onCanonUpdateTags}
                onAssignPoseKey={onAssignCanonPoseKey}
                isUploading={isCanonUploading}
                canonPosePresets={canonPosePresets}
                onGeneratePosition={onGeneratePosition}
                generatingPoseKey={generatingPoseKey}
                hasReferenceImage={hasReferenceImage}
                onUpdatePresetPrompt={onUpdatePresetPrompt}
                onSendToWorkspace={handleSendToWorkspace}
              />
            ) : (
              <p className="text-xs text-muted-foreground">Positions not available.</p>
            )}
          </div>
        </ScrollArea>
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
