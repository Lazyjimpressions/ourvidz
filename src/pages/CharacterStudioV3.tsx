import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, ChevronDown, Check, AlertCircle, MessageSquare, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useCharacterStudio, CharacterScene } from '@/hooks/useCharacterStudio';
import { useImageModels } from '@/hooks/useImageModels';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { StudioSidebar } from '@/components/character-studio-v3/StudioSidebar';
import { StudioWorkspace } from '@/components/character-studio-v3/StudioWorkspace';
import { CharacterSelector } from '@/components/character-studio/CharacterSelector';
import { CharacterTemplateSelector } from '@/components/character-studio/CharacterTemplateSelector';
import { ImagePickerDialog } from '@/components/storyboard/ImagePickerDialog';
import { SceneGenerationModal } from '@/components/roleplay/SceneGenerationModal';

export default function CharacterStudioV3() {
  const { id: characterId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const roleParam = searchParams.get('role');
  const defaultRole: 'user' | 'ai' = roleParam === 'user' ? 'user' : 'ai';
  const entryMode = searchParams.get('mode'); // 'from-image' | 'from-description' | null

  const studio = useCharacterStudio({ characterId, defaultRole });
  const {
    character, updateCharacter, isNewCharacter, isDirty, isLoading, isSaving,
    savedCharacterId, saveCharacter, clearSuggestions, portraits, primaryPortrait, setPrimaryPortrait,
    deletePortrait, scenes, isGenerating, generationProgress, generatePortrait,
    selectItem, selectedItemId, selectedItemType
  } = studio;

  // Prevent auto-save retry loop after failure
  const saveFailedRef = useRef(false);

  // Image models
  const hasReferenceImage = !!character.reference_image_url;
  const { modelOptions: imageModelOptions, defaultModel } = useImageModels(hasReferenceImage);
  const [selectedImageModel, setSelectedImageModel] = useState('');

  // Dialogs
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showSceneModal, setShowSceneModal] = useState(false);
  const [sceneToEdit, setSceneToEdit] = useState<CharacterScene | null>(null);

  // Mobile tab
  const [mobileTab, setMobileTab] = useState<'details' | 'portraits' | 'scenes'>('details');
  // Desktop workspace tab
  const [workspaceTab, setWorkspaceTab] = useState<'portraits' | 'scenes'>('portraits');
  // Prompt text
  const [promptText, setPromptText] = useState('');

  // Resizable sidebar
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const isResizing = useRef(false);

  // Set default model
  useEffect(() => {
    if (defaultModel && !selectedImageModel) setSelectedImageModel(defaultModel.value);
  }, [defaultModel, selectedImageModel]);

  // Reset saveFailedRef when user makes a new edit
  useEffect(() => {
    if (isDirty) saveFailedRef.current = false;
  }, [character]);

  // Auto-save on dirty (2s debounce) - skip if last silent save failed
  useEffect(() => {
    if (!isDirty || isNewCharacter || saveFailedRef.current) return;
    const t = setTimeout(async () => {
      const result = await saveCharacter({ silent: true });
      if (result === null && isDirty) {
        saveFailedRef.current = true;
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [isDirty, isNewCharacter, character, saveCharacter]);

  // I2I model auto-switch
  const prevHasRef = useRef(hasReferenceImage);
  useEffect(() => {
    if (prevHasRef.current === hasReferenceImage) { prevHasRef.current = hasReferenceImage; return; }
    if (hasReferenceImage) {
      const cur = imageModelOptions.find(m => m.value === selectedImageModel);
      if (cur && !cur.capabilities?.supports_i2i) {
        const i2i = imageModelOptions.find(m => m.capabilities?.supports_i2i && m.isAvailable);
        if (i2i) { setSelectedImageModel(i2i.value); toast({ title: 'Model Switched', description: `Switched to ${i2i.label} (supports reference images)` }); }
      }
    }
    prevHasRef.current = hasReferenceImage;
  }, [hasReferenceImage, imageModelOptions, selectedImageModel, toast]);

  // Resize handler
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); isResizing.current = true;
    document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const move = (e: MouseEvent) => { if (isResizing.current) setSidebarWidth(Math.min(Math.max(e.clientX, 280), 480)); };
    const up = () => { isResizing.current = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    return () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
  }, []);

  // Handlers
  const handleGenerate = async (prompt: string, refUrl?: string, modelId?: string) => {
    await generatePortrait(prompt, {
      referenceImageUrl: refUrl || character.reference_image_url || undefined,
      model: modelId || selectedImageModel
    });
  };

  const handleUseAsReference = (portrait: { image_url: string }) => updateCharacter({ reference_image_url: portrait.image_url });
  const handleTemplateSelect = (templateData: any) => {
    updateCharacter({ appearance_tags: templateData.appearance_tags || [], traits: templateData.traits || '', persona: templateData.persona || '', first_message: templateData.first_message || '', voice_tone: templateData.voice_tone || 'warm', mood: templateData.mood || 'friendly' });
    toast({ title: 'Template Applied', description: 'Fields pre-filled. Customize as needed.', duration: 3000 });
  };

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  // Shared sidebar props
  const sidebarProps = {
    character, updateCharacter, isNewCharacter, isDirty, isSaving, isGenerating,
    selectedImageModel, onImageModelChange: setSelectedImageModel, imageModelOptions,
    onOpenImagePicker: () => setShowImagePicker(true),
    onGenerate: handleGenerate, onSave: saveCharacter, primaryPortraitUrl: primaryPortrait?.image_url,
    entryMode, onClearSuggestions: clearSuggestions,
  };

  // Shared workspace props
  const workspaceProps = {
    portraits, primaryPortrait, setPrimaryPortrait, deletePortrait,
    scenes, isGenerating, generationProgress, isNewCharacter,
    selectedItemId, selectedItemType, selectItem, character,
    updateCharacter, selectedImageModel, onImageModelChange: setSelectedImageModel,
    imageModelOptions, onOpenImagePicker: () => setShowImagePicker(true),
    onGenerate: handleGenerate, promptText, setPromptText,
    onUseAsReference: handleUseAsReference,
    onEditScene: (s: CharacterScene) => { setSceneToEdit(s); setShowSceneModal(true); },
    onDeleteScene: async (id: string) => { console.log('Delete scene:', id); },
    onAddScene: () => setShowSceneModal(true),
    onStartChatWithScene: (s: CharacterScene) => { if (savedCharacterId) navigate(`/roleplay/chat/${savedCharacterId}?scene=${s.id}`); },
    workspaceTab, setWorkspaceTab,
    characterAppearanceTags: character.appearance_tags || [],
    onRegenerate: (prompt: string, refUrl: string) => { updateCharacter({ reference_image_url: refUrl }); handleGenerate(prompt, refUrl, selectedImageModel); },
  };

  // MOBILE
  if (isMobile) {
    return (
      <div className="h-screen w-full flex flex-col bg-background overflow-x-hidden">
        {/* Header */}
        <header className="h-11 border-b border-border flex items-center justify-between px-3 bg-card">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-1.5"><ArrowLeft className="w-4 h-4" /></Button>
          <CharacterSelector
            onSelect={(id) => navigate(`/character-studio/${id}`)}
            onCreateNew={() => navigate('/character-studio')}
            trigger={
              <button className="flex items-center gap-1 text-xs font-medium text-foreground">
                <span className="truncate max-w-[120px]">{isNewCharacter ? 'New Character' : character.name || 'Character'}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>
            }
          />
          <Button size="sm" className="h-7 text-xs px-2" onClick={() => saveCharacter()} disabled={isSaving || !isDirty}>
            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
          </Button>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-border bg-card">
          {(['details', 'portraits', 'scenes'] as const).map(tab => (
            <button key={tab} onClick={() => setMobileTab(tab)} className={cn('flex-1 py-2 text-xs font-medium capitalize transition-colors', mobileTab === tab ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground')}>
              {tab}{tab === 'portraits' && portraits.length > 0 && ` (${portraits.length})`}{tab === 'scenes' && scenes.length > 0 && ` (${scenes.length})`}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {mobileTab === 'details' && <StudioSidebar {...sidebarProps} />}
          {mobileTab === 'portraits' && <StudioWorkspace {...workspaceProps} mobileMode />}
          {mobileTab === 'scenes' && (
            <ScrollArea className="h-full">
              <div className="p-3 pb-24">
                <StudioWorkspace {...workspaceProps} mobileMode scenesOnly />
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Bottom bar for non-portrait tabs */}
        {mobileTab !== 'portraits' && (
          <div className="p-2 bg-card/95 backdrop-blur border-t border-border pb-safe">
            <Button className="w-full h-8 text-xs" onClick={() => savedCharacterId && navigate(`/roleplay/chat/${savedCharacterId}`)} disabled={isNewCharacter}>
              <MessageSquare className="w-3 h-3 mr-1.5" />Start Chat
            </Button>
          </div>
        )}

        <ImagePickerDialog isOpen={showImagePicker} onClose={() => setShowImagePicker(false)} onSelect={(url) => { updateCharacter({ reference_image_url: url }); setShowImagePicker(false); }} />
        {savedCharacterId && <SceneGenerationModal isOpen={showSceneModal} onClose={() => { setShowSceneModal(false); setSceneToEdit(null); }} characterId={savedCharacterId} character={{ name: character.name, id: savedCharacterId }} onSceneCreated={() => { setShowSceneModal(false); setSceneToEdit(null); }} />}
      </div>
    );
  }

  // DESKTOP
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-11 border-b border-border flex items-center justify-between px-4 bg-card">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-7 px-2 text-xs gap-1">
            <ArrowLeft className="w-3 h-3" />Back
          </Button>
          <div className="h-3 w-px bg-border" />
          <CharacterSelector
            onSelect={(id) => navigate(`/character-studio/${id}`)}
            onCreateNew={() => navigate('/character-studio')}
            trigger={
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                <Users className="w-3 h-3" />
                {isNewCharacter ? 'New Character' : character.name || 'Character'}
              </Button>
            }
          />
          {isNewCharacter && !character.name && (
            <>
              <div className="h-3 w-px bg-border" />
              <Button variant="outline" size="sm" onClick={() => setShowTemplateSelector(true)} className="h-7 px-2 text-xs gap-1">
                📋 Template
              </Button>
            </>
          )}
          {!isNewCharacter && (
            <Badge variant={isDirty ? 'secondary' : 'default'} className="h-4 text-[10px] gap-0.5 px-1">
              {isSaving ? <Loader2 className="w-2 h-2 animate-spin" /> : isDirty ? <AlertCircle className="w-2 h-2" /> : <Check className="w-2 h-2" />}
              {isSaving ? 'Saving' : isDirty ? 'Unsaved' : 'Saved'}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => savedCharacterId && navigate(`/roleplay/chat/${savedCharacterId}`)} disabled={isNewCharacter}>
            <MessageSquare className="w-3 h-3" />Chat
          </Button>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="flex-shrink-0 hidden md:flex relative" style={{ width: sidebarWidth }}>
          <div className="flex-1 overflow-hidden">
            <StudioSidebar {...sidebarProps} />
          </div>
          <div onMouseDown={handleMouseDown} className="w-1 hover:w-1.5 bg-transparent hover:bg-primary/20 cursor-col-resize transition-all flex items-center justify-center group absolute right-0 top-0 bottom-0 z-10">
            <div className="w-0.5 h-8 bg-border group-hover:bg-primary/50 rounded-full" />
          </div>
        </div>

        {/* Workspace */}
        <StudioWorkspace {...workspaceProps} />
      </div>

      {/* Modals */}
      <ImagePickerDialog isOpen={showImagePicker} onClose={() => setShowImagePicker(false)} onSelect={(url) => { updateCharacter({ reference_image_url: url }); setShowImagePicker(false); }} />
      <CharacterTemplateSelector open={showTemplateSelector} onOpenChange={setShowTemplateSelector} onSelectTemplate={handleTemplateSelect} />
      {savedCharacterId && <SceneGenerationModal isOpen={showSceneModal} onClose={() => { setShowSceneModal(false); setSceneToEdit(null); }} characterId={savedCharacterId} character={{ name: character.name, id: savedCharacterId }} onSceneCreated={() => { setShowSceneModal(false); setSceneToEdit(null); }} />}
    </div>
  );
}
