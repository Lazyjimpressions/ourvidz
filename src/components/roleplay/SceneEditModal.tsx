import React, { useState, useEffect } from 'react';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CharacterScene } from '@/types/roleplay';

interface SceneEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  scene: CharacterScene | null;
  onSceneUpdated?: (updatedScene: CharacterScene) => void;
}

export const SceneEditModal: React.FC<SceneEditModalProps> = ({
  isOpen,
  onClose,
  scene,
  onSceneUpdated
}) => {
  const [sceneName, setSceneName] = useState('');
  const [sceneDescription, setSceneDescription] = useState('');
  const [scenePrompt, setScenePrompt] = useState('');
  const [sceneRules, setSceneRules] = useState('');
  const [sceneStarters, setSceneStarters] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [priority, setPriority] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (scene && isOpen) {
      setSceneName(scene.scene_name || '');
      setSceneDescription(scene.scene_description || '');
      setScenePrompt(scene.scene_prompt || '');
      setSceneRules(scene.scene_rules || '');
      // Convert array to newline-separated string for editing
      setSceneStarters(scene.scene_starters?.join('\n') || '');
      setSystemPrompt(scene.system_prompt || '');
      setPriority(scene.priority || 0);
    }
  }, [scene, isOpen]);

  const handleSave = async () => {
    if (!scene) return;

    if (!sceneName.trim()) {
      toast({
        title: "Validation Error",
        description: "Scene name is required",
        variant: "destructive",
      });
      return;
    }

    if (!scenePrompt.trim()) {
      toast({
        title: "Validation Error",
        description: "Scene prompt is required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Parse scene_starters from newline-separated string to array
      const startersArray = sceneStarters
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const { data, error } = await supabase
        .from('character_scenes')
        .update({
          scene_name: sceneName.trim(),
          scene_description: sceneDescription.trim() || null,
          scene_prompt: scenePrompt.trim(),
          scene_rules: sceneRules.trim() || null,
          scene_starters: startersArray.length > 0 ? startersArray : null,
          system_prompt: systemPrompt.trim() || null,
          priority: priority,
          updated_at: new Date().toISOString()
        })
        .eq('id', scene.id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Scene Updated",
        description: "Scene has been updated successfully",
      });

      if (onSceneUpdated && data) {
        onSceneUpdated(data as CharacterScene);
      }

      onClose();
    } catch (error) {
      console.error('Error updating scene:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update scene",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!scene) return null;

  return (
    <ResponsiveModal open={isOpen} onOpenChange={onClose}>
      <ResponsiveModalContent className="bg-background border-border text-foreground max-w-sm">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle className="text-lg">Edit Scene</ResponsiveModalTitle>
        </ResponsiveModalHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-scene-name" className="text-sm font-medium">
              Scene Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-scene-name"
              value={sceneName}
              onChange={(e) => setSceneName(e.target.value)}
              placeholder="Enter scene name..."
              className="text-sm mt-1"
            />
          </div>

          <div>
            <Label htmlFor="edit-scene-description" className="text-sm font-medium">
              Scene Description (Optional)
            </Label>
            <Textarea
              id="edit-scene-description"
              value={sceneDescription}
              onChange={(e) => setSceneDescription(e.target.value)}
              placeholder="Brief description of the scene..."
              className="min-h-[60px] text-sm mt-1"
            />
          </div>

          <div>
            <Label htmlFor="edit-scene-prompt" className="text-sm font-medium">
              Scene Prompt <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="edit-scene-prompt"
              value={scenePrompt}
              onChange={(e) => setScenePrompt(e.target.value)}
              placeholder="Describe the scene..."
              className="min-h-[100px] text-sm mt-1"
            />
          </div>

          <div>
            <Label htmlFor="edit-scene-rules" className="text-sm font-medium">
              Scene Rules (Optional)
            </Label>
            <Textarea
              id="edit-scene-rules"
              value={sceneRules}
              onChange={(e) => setSceneRules(e.target.value)}
              placeholder="Rules or constraints for this scene..."
              className="min-h-[60px] text-sm mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Behavior rules the AI should follow in this scenario
            </p>
          </div>

          <div>
            <Label htmlFor="edit-scene-starters" className="text-sm font-medium">
              Conversation Starters (Optional)
            </Label>
            <Textarea
              id="edit-scene-starters"
              value={sceneStarters}
              onChange={(e) => setSceneStarters(e.target.value)}
              placeholder="Enter one starter per line..."
              className="min-h-[80px] text-sm mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Opening messages to suggest when starting this scenario (one per line)
            </p>
          </div>

          <div>
            <Label htmlFor="edit-system-prompt" className="text-sm font-medium">
              System Prompt Override (Optional)
            </Label>
            <Textarea
              id="edit-system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Custom system instructions for this scenario..."
              className="min-h-[80px] text-sm mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Overrides the character's default system prompt for this scenario
            </p>
          </div>

          <div>
            <Label htmlFor="edit-scene-priority" className="text-sm font-medium">
              Priority
            </Label>
            <Input
              id="edit-scene-priority"
              type="number"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
              className="text-sm mt-1"
              min="0"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Higher priority scenes appear first in lists
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !sceneName.trim() || !scenePrompt.trim()}
              className="flex-1"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
