import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSceneCreation, SceneFormData, SceneAIOptions } from '@/hooks/useSceneCreation';
import { useRoleplayModels } from '@/hooks/useRoleplayModels';
import { useImageModels } from '@/hooks/useImageModels';
import { Sparkles, Undo2, ImageIcon, RefreshCw, Loader2, Plus, X, HelpCircle, MessageSquare } from 'lucide-react';
import type { ContentRating, SceneTemplate } from '@/types/roleplay';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SceneCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSceneCreated?: (scene: SceneTemplate) => void;
  editScene?: SceneTemplate | null;
}

// Scenario type options
const SCENARIO_TYPES = [
  { value: 'stranger', label: 'Stranger' },
  { value: 'relationship', label: 'Relationship' },
  { value: 'power_dynamic', label: 'Power Dynamic' },
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'slow_burn', label: 'Slow Burn' },
];

export const SceneCreationModal = ({
  isOpen,
  onClose,
  onSceneCreated,
  editScene
}: SceneCreationModalProps) => {
  const {
    enhanceScene,
    isEnhancing,
    enhancedData,
    originalDescription,
    undoEnhancement,
    generatePreview,
    isGeneratingPreview,
    generateStarters,
    isGeneratingStarters,
    createScene,
    updateScene,
    isCreating,
    reset
  } = useSceneCreation();

  // Load available models
  const { allModelOptions: chatModels, isLoading: loadingChatModels } = useRoleplayModels();
  const { modelOptions: imageModels, isLoading: loadingImageModels } = useImageModels();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contentRating, setContentRating] = useState<ContentRating>('nsfw');
  const [scenarioType, setScenarioType] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [scenePrompt, setScenePrompt] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [sceneStarters, setSceneStarters] = useState('');
  // ✅ PHASE 1: Enhanced narrative generation fields
  const [sceneFocus, setSceneFocus] = useState<'setting' | 'character' | 'interaction' | 'atmosphere'>('setting');
  const [narrativeStyle, setNarrativeStyle] = useState<'concise' | 'detailed' | 'atmospheric'>('concise');
  const [visualPriority, setVisualPriority] = useState<string[]>(['setting', 'lighting', 'positioning']);
  const [perspectiveHint, setPerspectiveHint] = useState<'third_person' | 'pov' | 'observer'>('third_person');
  const [maxWords, setMaxWords] = useState(60);
  const [showAdvancedNarrative, setShowAdvancedNarrative] = useState(false);

  // Model selection state - use "auto" as default value instead of empty string
  // (Radix UI Select has issues with empty string values)
  const [selectedChatModel, setSelectedChatModel] = useState<string>('auto');
  const [selectedImageModel, setSelectedImageModel] = useState<string>('auto');

  // Track if enhanced data has been applied
  const [hasEnhanced, setHasEnhanced] = useState(false);

  // Get AI options based on selected models
  // Convert "auto" back to undefined for the hooks
  const getAIOptions = useCallback((): SceneAIOptions => ({
    chatModel: selectedChatModel === 'auto' ? undefined : selectedChatModel,
    imageModel: selectedImageModel === 'auto' ? undefined : selectedImageModel
  }), [selectedChatModel, selectedImageModel]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      console.log('🎬 SceneCreationModal opened', {
        editMode: !!editScene,
        editSceneId: editScene?.id,
        editSceneName: editScene?.name
      });

      if (editScene) {
        // Edit mode - populate with existing scene data
        try {
          setName(editScene.name || '');
          setDescription(editScene.description || '');
          setContentRating(editScene.content_rating || 'nsfw');
          setScenarioType(editScene.scenario_type || null);
          setTags(Array.isArray(editScene.tags) ? editScene.tags : []);
          setIsPublic(editScene.is_public !== undefined ? editScene.is_public : true);
          setScenePrompt(editScene.scene_prompt || '');
          setPreviewImageUrl(editScene.preview_image_url || null);
          // Handle scene_starters safely - ensure it's an array before joining
          const starters = Array.isArray(editScene.scene_starters)
            ? editScene.scene_starters.join('\n')
            : '';
          setSceneStarters(starters);
          // ✅ PHASE 1: Load enhanced narrative fields
          setSceneFocus(editScene.scene_focus || 'setting');
          setNarrativeStyle(editScene.narrative_style || 'concise');
          setVisualPriority(editScene.visual_priority || ['setting', 'lighting', 'positioning']);
          setPerspectiveHint(editScene.perspective_hint || 'third_person');
          setMaxWords(editScene.max_words || 60);
          setHasEnhanced(false);
          console.log('✅ Edit mode form populated');
        } catch (err) {
          console.error('❌ Error populating edit form:', err);
        }
      } else {
        // Create mode - reset form
        setName('');
        setDescription('');
        setContentRating('nsfw');
        setScenarioType(null);
        setTags([]);
        setIsPublic(true);
        setScenePrompt('');
        setPreviewImageUrl(null);
        setSceneStarters('');
        // ✅ PHASE 1: Reset enhanced narrative fields to defaults
        setSceneFocus('setting');
        setNarrativeStyle('concise');
        setVisualPriority(['setting', 'lighting', 'positioning']);
        setPerspectiveHint('third_person');
        setMaxWords(60);
        setShowAdvancedNarrative(false);
        setSelectedChatModel('auto');
        setSelectedImageModel('auto');
        setHasEnhanced(false);
        reset();
      }
    }
  }, [isOpen, editScene, reset]);

  // Apply enhanced data when available
  useEffect(() => {
    if (enhancedData && !hasEnhanced) {
      setDescription(enhancedData.enhanced_description);
      setScenePrompt(enhancedData.scene_prompt);
      if (enhancedData.suggested_tags.length > 0) {
        setTags(prev => [...new Set([...prev, ...enhancedData.suggested_tags])]);
      }
      if (enhancedData.suggested_scenario_type && !scenarioType) {
        setScenarioType(enhancedData.suggested_scenario_type);
      }
      setHasEnhanced(true);
    }
  }, [enhancedData, hasEnhanced, scenarioType]);

  // Handle enhance button click
  const handleEnhance = useCallback(async () => {
    const result = await enhanceScene(description, contentRating, getAIOptions());
    if (result) {
      setHasEnhanced(false); // Allow re-apply
    }
  }, [enhanceScene, description, contentRating, getAIOptions]);

  // Handle undo enhancement
  const handleUndo = useCallback(() => {
    if (originalDescription) {
      setDescription(originalDescription);
      setScenePrompt('');
      setHasEnhanced(false);
      undoEnhancement();
    }
  }, [originalDescription, undoEnhancement]);

  // Handle generate preview
  const handleGeneratePreview = useCallback(async () => {
    const url = await generatePreview(scenePrompt || description, contentRating, getAIOptions());
    if (url) {
      setPreviewImageUrl(url);
    }
  }, [generatePreview, scenePrompt, description, contentRating, getAIOptions]);

  // Handle generate starters
  const handleGenerateStarters = useCallback(async () => {
    const starters = await generateStarters(description, contentRating, getAIOptions());
    if (starters && starters.length > 0) {
      setSceneStarters(starters.join('\n'));
    }
  }, [generateStarters, description, contentRating, getAIOptions]);

  // Handle add tag
  const handleAddTag = useCallback(() => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags(prev => [...prev, tag]);
      setNewTag('');
    }
  }, [newTag, tags]);

  // Handle remove tag
  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  }, []);

  const { toast } = useToast();

  // Handle create or update scene
  const handleCreate = useCallback(async () => {
    // Verify session is still valid before attempting database operation
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please log in again.",
        variant: "destructive",
      });
      return;
    }
    const formData: SceneFormData = {
      name,
      description,
      content_rating: contentRating,
      scenario_type: scenarioType,
      tags,
      is_public: isPublic,
      scene_prompt: scenePrompt || null,
      preview_image_url: previewImageUrl,
      scene_starters: sceneStarters.split('\n').filter(s => s.trim()),
      // ✅ PHASE 1: Enhanced narrative generation fields
      scene_focus: sceneFocus,
      narrative_style: narrativeStyle,
      visual_priority: visualPriority,
      perspective_hint: perspectiveHint,
      max_words: maxWords
    };

    // Use updateScene if editing, createScene if new
    const scene = editScene
      ? await updateScene(editScene.id, formData)
      : await createScene(formData);

    if (scene) {
      onSceneCreated?.(scene);
      onClose();
    }
  }, [
    name, description, contentRating, scenarioType, tags,
    isPublic, scenePrompt, previewImageUrl, sceneStarters,
    sceneFocus, narrativeStyle, visualPriority, perspectiveHint, maxWords,
    editScene, createScene, updateScene, onSceneCreated, onClose
  ]);

  // Handle close
  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const isEditMode = !!editScene;
  const canCreate = name.trim() && description.trim();
  const isLoading = isEnhancing || isGeneratingPreview || isGeneratingStarters || isCreating;

  // Debug logging for render
  if (isOpen) {
    console.log('🎬 SceneCreationModal render:', {
      isOpen,
      isEditMode,
      editSceneId: editScene?.id,
      chatModelsCount: chatModels?.length,
      imageModelsCount: imageModels?.length,
      loadingChatModels,
      loadingImageModels
    });
  }

  return (
    <ResponsiveModal open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <ResponsiveModalContent className="max-w-2xl">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>
            {isEditMode ? 'Edit Scene Template' : 'Create Scene Template'}
          </ResponsiveModalTitle>
        </ResponsiveModalHeader>

        <div className="space-y-6 py-4">
          {/* Scene Name */}
          <div className="space-y-2">
            <Label htmlFor="scene-name">Scene Name *</Label>
            <Input
              id="scene-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Cozy Coffee Shop, Late Night Office"
              disabled={isLoading}
            />
          </div>

          {/* Scene Description */}
          <div className="space-y-2">
            <Label htmlFor="scene-description">Describe your scene *</Label>
            <Textarea
              id="scene-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the setting, mood, and situation. AI will enhance this for roleplay and image generation."
              rows={4}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Describe the setting, mood, and situation. AI will optimize for roleplay and images.
            </p>
          </div>

          {/* Model Selection */}
          <TooltipProvider>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Chat Model</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p>Choose which AI model enhances your scene description and generates conversation starters.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Select
                  value={selectedChatModel}
                  onValueChange={setSelectedChatModel}
                  disabled={isLoading || loadingChatModels}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingChatModels ? "Loading..." : "Auto (default)"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (default)</SelectItem>
                    {chatModels?.map(model => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                        {!model.isAvailable && ' (offline)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Image Model</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p>Choose which AI model generates the preview thumbnail image.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Select
                  value={selectedImageModel}
                  onValueChange={setSelectedImageModel}
                  disabled={isLoading || loadingImageModels}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingImageModels ? "Loading..." : "Auto (default)"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (default)</SelectItem>
                    {imageModels?.map(model => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TooltipProvider>

          {/* Enhancement buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEnhance}
              disabled={isLoading || !description.trim()}
            >
              {isEnhancing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Enhance with AI
            </Button>
            {originalDescription && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={isLoading}
              >
                <Undo2 className="w-4 h-4 mr-2" />
                Undo
              </Button>
            )}
          </div>

          <Separator />

          {/* AI-Generated Section */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground">
              {enhancedData ? 'AI-Generated' : 'Optional Settings'}
            </p>

            {/* Scenario Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Scenario Type</Label>
                <Select
                  value={scenarioType || 'none'}
                  onValueChange={(value) => setScenarioType(value === 'none' ? null : value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    {SCENARIO_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Content Rating */}
              <div className="space-y-2">
                <Label>Content Rating</Label>
                <Select
                  value={contentRating}
                  onValueChange={(value) => setContentRating(value as ContentRating)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sfw">SFW</SelectItem>
                    <SelectItem value="nsfw">NSFW</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tags */}
            <TooltipProvider>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Tags</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p>Tags help users discover your scene. Add keywords like "romantic", "office", "mystery" etc.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                        disabled={isLoading}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleAddTag}
                    disabled={isLoading || !newTag.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </TooltipProvider>

            {/* Scene Prompt */}
            <div className="space-y-2">
              <Label htmlFor="scene-prompt">Scene Prompt (for images)</Label>
              <Textarea
                id="scene-prompt"
                value={scenePrompt}
                onChange={(e) => setScenePrompt(e.target.value)}
                placeholder="Auto-generated from description, or customize for image generation"
                rows={3}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                This prompt is used when generating scene images during roleplay.
              </p>
            </div>

            {/* Preview Thumbnail */}
            <div className="space-y-2">
              <Label>Preview Thumbnail</Label>
              <div className="flex gap-4 items-start">
                <div className="w-32 h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted/50">
                  {previewImageUrl ? (
                    <img
                      src={previewImageUrl}
                      alt="Scene preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground text-xs p-2">
                      <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                      Click Generate
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGeneratePreview}
                    disabled={isLoading || (!scenePrompt.trim() && !description.trim())}
                  >
                    {isGeneratingPreview ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ImageIcon className="w-4 h-4 mr-2" />
                    )}
                    Generate Preview
                  </Button>
                  {previewImageUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleGeneratePreview}
                      disabled={isLoading}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Regenerate
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Conversation Starters */}
            <TooltipProvider>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="scene-starters">Conversation Starters</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p>Suggested opening lines that fit this scene. These help users start conversations naturally.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateStarters}
                    disabled={isLoading || !description.trim()}
                  >
                    {isGeneratingStarters ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <MessageSquare className="w-4 h-4 mr-2" />
                    )}
                    Generate with AI
                  </Button>
                </div>
                <Textarea
                  id="scene-starters"
                  value={sceneStarters}
                  onChange={(e) => setSceneStarters(e.target.value)}
                  placeholder="One starter per line, e.g.:&#10;Hey, I noticed you sitting alone...&#10;This place has the best coffee, doesn't it?"
                  rows={3}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Suggested conversation openers for this scene. One per line.
                </p>
              </div>
            </TooltipProvider>

            <Separator />

            {/* ✅ PHASE 1: Advanced Narrative Settings */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Advanced Narrative Settings</Label>
                  <p className="text-xs text-muted-foreground">
                    Control how scene descriptions are generated during roleplay
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvancedNarrative(!showAdvancedNarrative)}
                  disabled={isLoading}
                >
                  {showAdvancedNarrative ? 'Hide' : 'Show'}
                </Button>
              </div>

              {showAdvancedNarrative && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Scene Focus</Label>
                      <Select
                        value={sceneFocus}
                        onValueChange={(value) => setSceneFocus(value as typeof sceneFocus)}
                        disabled={isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="setting">Setting</SelectItem>
                          <SelectItem value="character">Character</SelectItem>
                          <SelectItem value="interaction">Interaction</SelectItem>
                          <SelectItem value="atmosphere">Atmosphere</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        What aspect to emphasize in descriptions
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Narrative Style</Label>
                      <Select
                        value={narrativeStyle}
                        onValueChange={(value) => setNarrativeStyle(value as typeof narrativeStyle)}
                        disabled={isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="concise">Concise (40-60 words)</SelectItem>
                          <SelectItem value="detailed">Detailed (80-120 words)</SelectItem>
                          <SelectItem value="atmospheric">Atmospheric (60-100 words)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Verbosity level for scene descriptions
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Visual Priority</Label>
                    <div className="flex flex-wrap gap-2">
                      {['lighting', 'clothing', 'positioning', 'setting'].map((priority) => (
                        <Badge
                          key={priority}
                          variant={visualPriority.includes(priority) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => {
                            if (isLoading) return;
                            setVisualPriority(prev =>
                              prev.includes(priority)
                                ? prev.filter(p => p !== priority)
                                : [...prev, priority]
                            );
                          }}
                        >
                          {priority}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Click to toggle visual elements to prioritize
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Perspective</Label>
                      <Select
                        value={perspectiveHint}
                        onValueChange={(value) => setPerspectiveHint(value as typeof perspectiveHint)}
                        disabled={isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="third_person">Third Person</SelectItem>
                          <SelectItem value="pov">Point of View</SelectItem>
                          <SelectItem value="observer">Observer</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Prevents first-person dialogue
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Max Words: {maxWords}</Label>
                      <input
                        type="range"
                        min="20"
                        max="200"
                        value={maxWords}
                        onChange={(e) => setMaxWords(Number(e.target.value))}
                        disabled={isLoading}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Override default word limit (20-200)
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Visibility */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is-public">Make Public</Label>
                <p className="text-xs text-muted-foreground">
                  Allow others to discover and use this scene
                </p>
              </div>
              <Switch
                id="is-public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!canCreate || isLoading}
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {isEditMode ? 'Save Changes' : 'Create Scene'}
            </Button>
          </div>
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};

export default SceneCreationModal;
