import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  MessageSquare,
  ExternalLink,
  Loader2,
  Users,
  ChevronDown,
  Check,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCharacterStudio } from '@/hooks/useCharacterStudio';
import { CharacterStudioSidebar } from '@/components/character-studio/CharacterStudioSidebar';
import { PortraitGallery } from '@/components/character-studio/PortraitGallery';
import { ScenesGallery } from '@/components/character-studio/ScenesGallery';
import { CharacterStudioPromptBar } from '@/components/character-studio/CharacterStudioPromptBar';
import { SceneGenerationModal } from '@/components/roleplay/SceneGenerationModal';
import { ImagePickerDialog } from '@/components/storyboard/ImagePickerDialog';
import { CharacterSelector } from '@/components/character-studio/CharacterSelector';
import { CharacterTemplateSelector } from '@/components/character-studio/CharacterTemplateSelector';
import { useImageModels } from '@/hooks/useImageModels';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { CharacterScene } from '@/hooks/useCharacterStudio';

export default function CharacterStudio() {
  const { id: characterId } = useParams<{ id: string}>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  const {
    character,
    updateCharacter,
    isNewCharacter,
    isDirty,
    isLoading,
    isSaving,
    savedCharacterId,
    saveCharacter,
    portraits,
    primaryPortrait,
    portraitsLoading,
    setPrimaryPortrait,
    deletePortrait,
    scenes,
    isGenerating,
    generationProgress,
    generatePortrait,
    selectItem,
    selectedItemId,
    selectedItemType
  } = useCharacterStudio({ characterId });

  // Image model state - track reference image for Image Match Mode filtering
  const hasReferenceImage = !!character.reference_image_url;
  const { modelOptions: imageModelOptions, defaultModel } = useImageModels(hasReferenceImage);
  const [selectedImageModel, setSelectedImageModel] = useState<string>('');
  
  // Image picker state
  const [showImagePicker, setShowImagePicker] = useState(false);

  // Template selector state
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // Set default model when loaded
  React.useEffect(() => {
    if (defaultModel && !selectedImageModel) {
      setSelectedImageModel(defaultModel.value);
    }
  }, [defaultModel, selectedImageModel]);

  // Debounced auto-save on field changes (2s delay)
  useEffect(() => {
    if (!isDirty || isNewCharacter) return;

    const timeout = setTimeout(() => {
      saveCharacter({ silent: true });
    }, 2000);

    return () => clearTimeout(timeout);
  }, [isDirty, isNewCharacter, character, saveCharacter]);

  // Track previous reference image state for Image Match Mode notifications
  const prevHasReferenceImage = React.useRef(hasReferenceImage);

  // Notify user when Image Match Mode changes (reference image added/removed)
  useEffect(() => {
    // Skip on initial mount
    if (prevHasReferenceImage.current === hasReferenceImage) {
      prevHasReferenceImage.current = hasReferenceImage;
      return;
    }

    if (hasReferenceImage && !prevHasReferenceImage.current) {
      // Reference image was added - Image Match Mode enabled
      const currentModel = imageModelOptions.find(m => m.value === selectedImageModel);
      const modelName = currentModel?.label.split(' ')[0] || 'compatible model';
      const i2iModelCount = imageModelOptions.filter(m => m.capabilities?.supports_i2i && m.isAvailable).length;

      toast({
        title: 'Reference Image Set',
        description: `New portraits will match this style. ${i2iModelCount} compatible ${i2iModelCount === 1 ? 'model' : 'models'} available.`,
        duration: 5000
      });
    } else if (!hasReferenceImage && prevHasReferenceImage.current) {
      // Reference image was removed - Image Match Mode disabled
      toast({
        title: 'Reference Image Removed',
        description: 'All models now available',
        duration: 3000
      });
    }

    prevHasReferenceImage.current = hasReferenceImage;
  }, [hasReferenceImage, selectedImageModel, imageModelOptions, toast]);

  // Auto-switch to I2I-compatible model when reference image is added
  useEffect(() => {
    if (hasReferenceImage) {
      const currentModel = imageModelOptions.find(m => m.value === selectedImageModel);

      // If current model doesn't support I2I, auto-switch to one that does
      if (currentModel && !currentModel.capabilities?.supports_i2i) {
        const i2iDefault = imageModelOptions.find(
          m => m.capabilities?.supports_i2i && m.isAvailable
        );

        if (i2iDefault) {
          setSelectedImageModel(i2iDefault.value);
          toast({
            title: 'Model Switched',
            description: `Switched to ${i2iDefault.label} (supports reference images)`,
            duration: 4000
          });
        } else {
          // No I2I models available
          toast({
            title: 'No Compatible Models',
            description: 'No models support reference images. Remove reference to see all models.',
            variant: 'destructive'
          });
        }
      }
    }
  }, [hasReferenceImage, selectedImageModel, imageModelOptions, toast, setSelectedImageModel]);

  // Modal states
  const [showSceneModal, setShowSceneModal] = useState(false);
  const [sceneToEdit, setSceneToEdit] = useState<CharacterScene | null>(null);

  // Handle portrait generation from prompt bar
  const handleGenerateFromPrompt = async (prompt: string, referenceImageUrl?: string, modelId?: string) => {
    await generatePortrait(prompt, { 
      referenceImageUrl: referenceImageUrl || character.reference_image_url || undefined,
      model: modelId || selectedImageModel 
    });
  };

  // Handle image picker selection
  const handleImagePickerSelect = (imageUrl: string) => {
    updateCharacter({ reference_image_url: imageUrl });
    setShowImagePicker(false);
  };

  // Handle template selection
  const handleTemplateSelect = (templateData: any) => {
    updateCharacter({
      appearance_tags: templateData.appearance_tags || [],
      traits: templateData.traits || '',
      persona: templateData.persona || '',
      first_message: templateData.first_message || '',
      voice_tone: templateData.voice_tone || 'warm',
      mood: templateData.mood || 'friendly'
    });
    toast({
      title: 'Template Applied',
      description: 'Character fields have been pre-filled. Customize as needed.',
      duration: 3000
    });
  };

  // Handle portrait actions
  const handleSelectPortrait = (id: string) => {
    selectItem(id, 'portrait');
  };

  const handleUseAsReference = (portrait: { image_url: string }) => {
    updateCharacter({ reference_image_url: portrait.image_url });
  };

  // Handle scene actions
  const handleSelectScene = (id: string) => {
    selectItem(id, 'scene');
  };

  const handleEditScene = (scene: CharacterScene) => {
    setSceneToEdit(scene);
    setShowSceneModal(true);
  };

  const handleDeleteScene = async (sceneId: string) => {
    // TODO: Implement scene deletion
    console.log('Delete scene:', sceneId);
  };

  const handleStartChatWithScene = (scene: CharacterScene) => {
    if (savedCharacterId) {
      navigate(`/roleplay/chat/${savedCharacterId}?scene=${scene.id}`);
    }
  };

  const handleSceneGenerated = () => {
    setShowSceneModal(false);
    setSceneToEdit(null);
    // Refresh scenes list
  };

  // Start chat with character
  const handleStartChat = () => {
    if (savedCharacterId) {
      navigate(`/roleplay/chat/${savedCharacterId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Mobile layout - use tabs
  if (isMobile) {
    return (
      <>
        <MobileCharacterStudio
          character={character}
          updateCharacter={updateCharacter}
          isNewCharacter={isNewCharacter}
          isDirty={isDirty}
          isSaving={isSaving}
          savedCharacterId={savedCharacterId}
          saveCharacter={saveCharacter}
          portraits={portraits}
          primaryPortrait={primaryPortrait}
          setPrimaryPortrait={setPrimaryPortrait}
          deletePortrait={deletePortrait}
          scenes={scenes}
          isGenerating={isGenerating}
          generatePortrait={generatePortrait}
          selectItem={selectItem}
          selectedItemId={selectedItemId}
          selectedItemType={selectedItemType}
          onStartChat={handleStartChat}
          selectedImageModel={selectedImageModel}
          onImageModelChange={setSelectedImageModel}
          imageModelOptions={imageModelOptions}
          onOpenImagePicker={() => setShowImagePicker(true)}
        />
        
        {/* Image Picker Dialog */}
        <ImagePickerDialog
          isOpen={showImagePicker}
          onClose={() => setShowImagePicker(false)}
          onSelect={handleImagePickerSelect}
        />
      </>
    );
  }

  // Handle character selection from selector
  const handleSelectCharacter = (selectedCharacterId: string) => {
    navigate(`/character-studio/${selectedCharacterId}`);
  };

  const handleCreateNewCharacter = () => {
    navigate('/character-studio');
  };

  // Desktop layout - sidebar + main workspace
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="h-4 w-px bg-border" />
          
          {/* Character Selector */}
          <CharacterSelector
            onSelect={handleSelectCharacter}
            onCreateNew={handleCreateNewCharacter}
            trigger={
              <Button variant="ghost" size="sm" className="gap-2">
                <Users className="w-4 h-4" />
                {isNewCharacter ? 'New Character' : character.name || 'Character'}
              </Button>
            }
          />

          {/* Template Button - For New Characters */}
          {isNewCharacter && !character.name && (
            <>
              <div className="h-4 w-px bg-border" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTemplateSelector(true)}
                className="h-8 px-3 text-xs gap-1.5"
              >
                <span>📋</span>
                Start from Template
              </Button>
            </>
          )}

          {/* Save Status Badge - Compact */}
          {!isNewCharacter && (
            <div className="flex items-center gap-1.5">
              {isSaving && (
                <Badge variant="outline" className="h-5 gap-1 text-[10px]">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  Saving
                </Badge>
              )}
              {!isSaving && !isDirty && (
                <Badge variant="default" className="h-5 gap-1 text-[10px]">
                  <Check className="w-2.5 h-2.5" />
                  Saved
                </Badge>
              )}
              {!isSaving && isDirty && (
                <Badge variant="secondary" className="h-5 gap-1 text-[10px]">
                  <AlertCircle className="w-2.5 h-2.5" />
                  Unsaved
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleStartChat}
            disabled={isNewCharacter || !savedCharacterId}
            className="gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Start Chat
          </Button>
          {!isNewCharacter && savedCharacterId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(`/roleplay/character/${savedCharacterId}`, '_blank')}
              className="gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Preview
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-80 flex-shrink-0 hidden md:block">
          <CharacterStudioSidebar
            character={character}
            onUpdateCharacter={updateCharacter}
            onSave={saveCharacter}
            onGenerate={generatePortrait}
            isSaving={isSaving}
            isGenerating={isGenerating}
            isDirty={isDirty}
            isNewCharacter={isNewCharacter}
            primaryPortraitUrl={primaryPortrait?.image_url}
            selectedImageModel={selectedImageModel}
            onImageModelChange={setSelectedImageModel}
            imageModelOptions={imageModelOptions}
            onOpenImagePicker={() => setShowImagePicker(true)}
          />
        </div>

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-8 max-w-6xl">
              {/* Portrait Gallery */}
              <PortraitGallery
                portraits={portraits}
                primaryPortraitId={primaryPortrait?.id}
                selectedPortraitId={selectedItemType === 'portrait' ? selectedItemId : null}
                isGenerating={isGenerating}
                isNewCharacter={isNewCharacter}
                onSelect={handleSelectPortrait}
                onSetPrimary={setPrimaryPortrait}
                onDelete={deletePortrait}
                onAddNew={() => handleGenerateFromPrompt(character.traits || character.name || 'portrait')}
                onUseAsReference={handleUseAsReference}
                onRegenerate={(prompt, referenceUrl) => {
                  updateCharacter({ reference_image_url: referenceUrl });
                  handleGenerateFromPrompt(prompt, referenceUrl, selectedImageModel);
                }}
                characterAppearanceTags={character.appearance_tags || []}
              />

              {/* Scenes Gallery */}
              <ScenesGallery
                scenes={scenes}
                selectedSceneId={selectedItemType === 'scene' ? selectedItemId : null}
                isNewCharacter={isNewCharacter}
                onSelect={handleSelectScene}
                onEdit={handleEditScene}
                onDelete={handleDeleteScene}
                onAddNew={() => setShowSceneModal(true)}
                onStartChat={handleStartChatWithScene}
              />
            </div>
          </ScrollArea>

          {/* Bottom Prompt Bar */}
          <CharacterStudioPromptBar
            onGenerate={handleGenerateFromPrompt}
            isGenerating={isGenerating}
            generationProgress={generationProgress}
            isDisabled={false}
            placeholder={`Describe a portrait for ${character.name || 'your character'}...`}
            selectedImageModel={selectedImageModel}
            onImageModelChange={setSelectedImageModel}
            imageModelOptions={imageModelOptions}
            onOpenImagePicker={() => setShowImagePicker(true)}
            referenceImageUrl={character.reference_image_url}
            onReferenceImageChange={(url) => updateCharacter({ reference_image_url: url })}
          />
        </div>
      </div>

      {/* Scene Generation Modal */}
      {savedCharacterId && (
        <SceneGenerationModal
          isOpen={showSceneModal}
          onClose={() => {
            setShowSceneModal(false);
            setSceneToEdit(null);
          }}
          characterId={savedCharacterId}
          character={{ name: character.name, id: savedCharacterId }}
          onSceneCreated={handleSceneGenerated}
        />
      )}

      {/* Image Picker Dialog */}
      <ImagePickerDialog
        isOpen={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onSelect={handleImagePickerSelect}
      />

      {/* Character Template Selector */}
      <CharacterTemplateSelector
        open={showTemplateSelector}
        onOpenChange={setShowTemplateSelector}
        onSelectTemplate={handleTemplateSelect}
      />
    </div>
  );
}

// Mobile version with tabs
interface MobileCharacterStudioProps {
  character: ReturnType<typeof useCharacterStudio>['character'];
  updateCharacter: ReturnType<typeof useCharacterStudio>['updateCharacter'];
  isNewCharacter: boolean;
  isDirty: boolean;
  isSaving: boolean;
  savedCharacterId?: string;
  saveCharacter: () => Promise<string | null>;
  portraits: ReturnType<typeof useCharacterStudio>['portraits'];
  primaryPortrait: ReturnType<typeof useCharacterStudio>['primaryPortrait'];
  setPrimaryPortrait: ReturnType<typeof useCharacterStudio>['setPrimaryPortrait'];
  deletePortrait: ReturnType<typeof useCharacterStudio>['deletePortrait'];
  scenes: ReturnType<typeof useCharacterStudio>['scenes'];
  isGenerating: boolean;
  generatePortrait: ReturnType<typeof useCharacterStudio>['generatePortrait'];
  selectItem: ReturnType<typeof useCharacterStudio>['selectItem'];
  selectedItemId: string | null;
  selectedItemType: 'portrait' | 'scene' | null;
  onStartChat: () => void;
  selectedImageModel: string;
  onImageModelChange: (modelId: string) => void;
  imageModelOptions: ReturnType<typeof useImageModels>['modelOptions'];
  onOpenImagePicker: () => void;
}

function MobileCharacterStudio({
  character,
  updateCharacter,
  isNewCharacter,
  isDirty,
  isSaving,
  savedCharacterId,
  saveCharacter,
  portraits,
  primaryPortrait,
  setPrimaryPortrait,
  deletePortrait,
  scenes,
  isGenerating,
  generatePortrait,
  selectItem,
  selectedItemId,
  selectedItemType,
  onStartChat,
  selectedImageModel,
  onImageModelChange,
  imageModelOptions,
  onOpenImagePicker
}: MobileCharacterStudioProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'details' | 'portraits' | 'scenes'>('details');

  return (
    <div className="h-screen w-full flex flex-col bg-background overflow-x-hidden">
      {/* Mobile Header */}
      <header className="h-12 border-b border-border flex items-center justify-between px-3 bg-card">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(-1)}
          className="p-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        {/* Character Selector */}
        <CharacterSelector
          onSelect={(id) => navigate(`/character-studio/${id}`)}
          onCreateNew={() => navigate('/character-studio')}
          trigger={
            <button className="flex items-center gap-1 text-sm font-medium text-foreground">
              <span className="truncate max-w-[120px]">
                {isNewCharacter ? 'New Character' : character.name || 'Character'}
              </span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
          }
        />
        
        <Button
          size="sm"
          onClick={saveCharacter}
          disabled={isSaving || !isDirty}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
        </Button>
      </header>

      {/* Tab Navigation */}
      <div className="flex border-b border-border bg-card">
        {(['details', 'portraits', 'scenes'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 py-2.5 text-sm font-medium capitalize transition-colors',
              activeTab === tab 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-muted-foreground'
            )}
          >
            {tab}
            {tab === 'portraits' && portraits.length > 0 && (
              <span className="ml-1 text-xs">({portraits.length})</span>
            )}
            {tab === 'scenes' && scenes.length > 0 && (
              <span className="ml-1 text-xs">({scenes.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'details' && (
          <CharacterStudioSidebar
            character={character}
            onUpdateCharacter={updateCharacter}
            onSave={saveCharacter}
            onGenerate={generatePortrait}
            isSaving={isSaving}
            isGenerating={isGenerating}
            isDirty={isDirty}
            isNewCharacter={isNewCharacter}
            primaryPortraitUrl={primaryPortrait?.image_url}
            selectedImageModel={selectedImageModel}
            onImageModelChange={onImageModelChange}
            imageModelOptions={imageModelOptions}
            onOpenImagePicker={onOpenImagePicker}
          />
        )}

        {activeTab === 'portraits' && (
          <div className="flex flex-col h-full">
            <ScrollArea className="flex-1">
              <div className="p-3 pb-2">
                <PortraitGallery
                  portraits={portraits}
                  primaryPortraitId={primaryPortrait?.id}
                  selectedPortraitId={selectedItemType === 'portrait' ? selectedItemId : null}
                  isGenerating={isGenerating}
                  isNewCharacter={isNewCharacter}
                  onSelect={(id) => selectItem(id, 'portrait')}
                  onSetPrimary={setPrimaryPortrait}
                  onDelete={deletePortrait}
                  onAddNew={() => generatePortrait(character.traits || character.name || 'portrait', { 
                    referenceImageUrl: character.reference_image_url || undefined,
                    model: selectedImageModel 
                  })}
                  onUseAsReference={(p) => updateCharacter({ reference_image_url: p.image_url })}
                  onRegenerate={(prompt, referenceUrl) => {
                    updateCharacter({ reference_image_url: referenceUrl });
                    generatePortrait(prompt, { 
                      referenceImageUrl: referenceUrl,
                      model: selectedImageModel 
                    });
                  }}
                  characterAppearanceTags={character.appearance_tags || []}
                />
              </div>
            </ScrollArea>
            
            {/* Prompt Bar for mobile portraits tab */}
            <CharacterStudioPromptBar
              onGenerate={(prompt, refUrl, modelId) =>
                generatePortrait(prompt, {
                  referenceImageUrl: refUrl || character.reference_image_url || undefined,
                  model: modelId || selectedImageModel
                })
              }
              isGenerating={isGenerating}
              generationProgress={generationProgress}
              isDisabled={false}
              placeholder={`Describe a portrait for ${character.name || 'your character'}...`}
              selectedImageModel={selectedImageModel}
              onImageModelChange={onImageModelChange}
              imageModelOptions={imageModelOptions}
              onOpenImagePicker={onOpenImagePicker}
              referenceImageUrl={character.reference_image_url}
              onReferenceImageChange={(url) => updateCharacter({ reference_image_url: url })}
            />
          </div>
        )}

        {activeTab === 'scenes' && (
          <ScrollArea className="h-full">
            <div className="p-4 pb-24">
              <ScenesGallery
                scenes={scenes}
                selectedSceneId={selectedItemType === 'scene' ? selectedItemId : null}
                isNewCharacter={isNewCharacter}
                onSelect={(id) => selectItem(id, 'scene')}
                onEdit={() => {}}
                onDelete={() => {}}
                onAddNew={() => {}}
                onStartChat={() => {}}
              />
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Mobile Bottom Bar - only show on Details and Scenes tabs */}
      {activeTab !== 'portraits' && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-card/95 backdrop-blur border-t border-border pb-safe">
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={onStartChat}
              disabled={isNewCharacter || !savedCharacterId}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Start Chat
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
