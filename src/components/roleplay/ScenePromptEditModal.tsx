import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Sparkles, RefreshCw, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { IntensitySelector } from './IntensitySelector';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface ScenePromptEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  sceneId?: string | null;
  jobId?: string | null;
  conversationId?: string | null;
  characterId?: string | null;
  currentPrompt?: string;
  characterVisualDescription?: string;
  consistencySettings?: {
    method?: string;
    reference_strength?: number;
    denoise_strength?: number;
  };
  currentSceneImageUrl?: string; // Current scene image for I2I modification
  onRegenerate?: (editedPrompt: string, currentSceneImageUrl?: string, strengthOverride?: number) => void;
}

export const ScenePromptEditModal: React.FC<ScenePromptEditModalProps> = ({
  isOpen,
  onClose,
  sceneId,
  jobId,
  conversationId,
  characterId,
  currentPrompt,
  characterVisualDescription,
  consistencySettings,
  currentSceneImageUrl,
  onRegenerate
}) => {
  const [editedPrompt, setEditedPrompt] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [sceneData, setSceneData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [generationMode, setGenerationMode] = useState<'modify' | 'fresh'>('modify');
  const [selectedStrength, setSelectedStrength] = useState(0.45);
  const { toast } = useToast();

  // Load scene data when modal opens
  useEffect(() => {
    if (isOpen && (sceneId || jobId)) {
      loadSceneData();
    }
  }, [isOpen, sceneId, jobId]);

  // Set prompt when currentPrompt or sceneData changes
  useEffect(() => {
    if (currentPrompt) {
      setEditedPrompt(currentPrompt);
      setOriginalPrompt(currentPrompt);
    } else if (sceneData?.scene_prompt) {
      setEditedPrompt(sceneData.scene_prompt);
      setOriginalPrompt(sceneData.scene_prompt);
    }
  }, [currentPrompt, sceneData]);

  const loadSceneData = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('character_scenes').select('*');
      
      if (sceneId) {
        query = query.eq('id', sceneId);
      } else if (jobId) {
        query = query.eq('job_id', jobId);
      } else {
        setIsLoading(false);
        return;
      }

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading scene data:', error);
      } else if (data) {
        setSceneData(data);
        if (data.scene_prompt) {
          setEditedPrompt(data.scene_prompt);
          setOriginalPrompt(data.scene_prompt);
        }
      }
    } catch (error) {
      console.error('Error loading scene data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!editedPrompt.trim()) {
      toast({
        title: "Validation Error",
        description: "Prompt cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (!characterId || !conversationId) {
      toast({
        title: "Error",
        description: "Missing required information for regeneration",
        variant: "destructive",
      });
      return;
    }

    setIsRegenerating(true);
    try {
      // Determine parameters based on generation mode
      const isModifyMode = generationMode === 'modify';
      const imageUrl = isModifyMode ? currentSceneImageUrl : undefined;
      const strength = isModifyMode ? selectedStrength : undefined;

      if (onRegenerate) {
        await onRegenerate(editedPrompt, imageUrl, strength);
        toast({
          title: "Scene Regeneration Started",
          description: isModifyMode
            ? `Modifying current scene (${Math.round(selectedStrength * 100)}% intensity)`
            : "Generating fresh scene from character reference",
        });
        onClose();
      } else {
        // Fallback: call roleplay-chat edge function directly
        const { data, error } = await supabase.functions.invoke('roleplay-chat', {
          body: {
            message: 'Regenerate scene with edited prompt.',
            conversation_id: conversationId,
            character_id: characterId,
            scene_generation: true,
            scene_prompt_override: editedPrompt,
            current_scene_image_url: currentSceneImageUrl, // For I2I modification
            consistency_settings: consistencySettings
          }
        });

        if (error) throw error;

        toast({
          title: "Scene Regeneration Started",
          description: currentSceneImageUrl
            ? "Modifying current scene with your edited prompt"
            : "Regenerating scene with your edited prompt",
        });
        onClose();
      }
    } catch (error) {
      console.error('Error regenerating scene:', error);
      toast({
        title: "Regeneration Failed",
        description: error instanceof Error ? error.message : "Failed to regenerate scene",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const hasChanges = editedPrompt.trim() !== originalPrompt.trim();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-background border-border text-foreground max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Edit Scene Prompt
          </DialogTitle>
          <DialogDescription>
            Edit the prompt used to generate this scene. Changes will be applied when you regenerate.
            <br />
            <span className="text-xs text-muted-foreground mt-1 block">
              ℹ️ {currentSceneImageUrl
                ? "Modification uses the current scene image to preserve context while applying your changes."
                : "Regeneration uses the character's reference image for consistency."}
            </span>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Generation Mode Toggle */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Generation Mode</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setGenerationMode('modify')}
                  disabled={isRegenerating}
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
                    generationMode === 'modify'
                      ? "bg-purple-600/20 border-purple-500"
                      : "bg-card border-border hover:bg-accent"
                  )}
                >
                  <RefreshCw className={cn(
                    "w-5 h-5",
                    generationMode === 'modify' ? "text-purple-400" : "text-muted-foreground"
                  )} />
                  <span className="font-medium text-sm">Modify Current</span>
                  <span className="text-xs text-muted-foreground">I2I Edit</span>
                </button>

                <button
                  onClick={() => setGenerationMode('fresh')}
                  disabled={isRegenerating}
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
                    generationMode === 'fresh'
                      ? "bg-blue-600/20 border-blue-500"
                      : "bg-card border-border hover:bg-accent"
                  )}
                >
                  <Sparkles className={cn(
                    "w-5 h-5",
                    generationMode === 'fresh' ? "text-blue-400" : "text-muted-foreground"
                  )} />
                  <span className="font-medium text-sm">Fresh Scene</span>
                  <span className="text-xs text-muted-foreground">From Character</span>
                </button>
              </div>
            </div>

            {/* Intensity Selector - Only for Modify mode */}
            {generationMode === 'modify' && (
              <div className="p-4 bg-muted/30 rounded-lg">
                <IntensitySelector
                  value={selectedStrength}
                  onChange={setSelectedStrength}
                  disabled={isRegenerating}
                  showSlider={true}
                />
              </div>
            )}

            {/* Character Visual Description (Read-only) */}
            {characterVisualDescription && (
              <div className="p-3 bg-muted/50 rounded-md">
                <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Character Visual Description (used in generation)
                </Label>
                <p className="text-sm text-foreground/80">{characterVisualDescription}</p>
              </div>
            )}

            {/* Consistency Settings */}
            {consistencySettings && (
              <div className="p-3 bg-muted/50 rounded-md">
                <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Consistency Settings
                </Label>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">
                    Method: {consistencySettings.method || 'hybrid'}
                  </Badge>
                  {consistencySettings.reference_strength !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      Ref Strength: {Math.round(consistencySettings.reference_strength * 100)}%
                    </Badge>
                  )}
                  {consistencySettings.denoise_strength !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      Denoise: {Math.round(consistencySettings.denoise_strength * 100)}%
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Scene Prompt Editor */}
            <div>
              <Label htmlFor="scene-prompt" className="text-sm font-medium mb-2 block">
                Scene Prompt
              </Label>
              <Textarea
                id="scene-prompt"
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                placeholder="Describe the scene you want to generate..."
                className="min-h-[200px] text-sm font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {editedPrompt.length} characters
                {hasChanges && (
                  <span className="text-amber-400 ml-2">• Modified from original</span>
                )}
              </p>
            </div>

            {/* Reference Image Preview & Info - Collapsible */}
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger className="w-full">
                <div className={`flex items-center justify-between p-3 rounded-md ${currentSceneImageUrl
                  ? 'bg-green-500/10 border border-green-500/20'
                  : 'bg-amber-500/10 border border-amber-500/20'
                }`}>
                  <div className="flex items-center gap-2">
                    <Info className={`w-4 h-4 ${currentSceneImageUrl ? 'text-green-300' : 'text-amber-300'}`} />
                    <p className={`text-xs font-medium ${currentSceneImageUrl ? 'text-green-300' : 'text-amber-300'}`}>
                      {currentSceneImageUrl ? 'I2I Modification Mode' : 'Reference Image Used'}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className={`p-3 rounded-md mt-2 ${currentSceneImageUrl
                  ? 'bg-green-500/10 border border-green-500/20'
                  : 'bg-amber-500/10 border border-amber-500/20'
                }`}>
                  {/* Reference Image Preview */}
                  {currentSceneImageUrl && (
                    <div className="mb-3">
                      <Label className="text-xs font-medium mb-2 block">Current Scene (Reference)</Label>
                      <img
                        src={currentSceneImageUrl}
                        alt="Current scene reference"
                        className="w-full max-h-48 object-contain rounded-md border border-gray-700 bg-gray-900"
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {currentSceneImageUrl
                      ? <>The system will use the <strong>current scene image</strong> as a base and apply your prompt changes using I2I (image-to-image). This preserves the scene context while modifying specific details.</>
                      : <>The system uses the <strong>character's reference image</strong> for consistency. If no scene is available, a new scene will be generated from scratch.</>
                    }
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Tips for Clothing Changes - Collapsible */}
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                  <p className="text-xs font-medium text-blue-300">💡 Tip: Changing Clothing</p>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md mt-2">
                  <p className="text-xs text-muted-foreground">
                    To change character clothing, add phrases like "wearing [description]" or "changed to [outfit]". 
                    The system will use I2I with higher denoise strength to modify clothing while maintaining character consistency.
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isRegenerating}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setEditedPrompt(originalPrompt);
                }}
                variant="outline"
                disabled={isRegenerating || !hasChanges}
                className="flex-1"
              >
                Reset
              </Button>
              <Button
                onClick={handleRegenerate}
                disabled={isRegenerating || !editedPrompt.trim() || (generationMode === 'modify' && !hasChanges)}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {isRegenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Regenerating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Regenerate Scene
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

