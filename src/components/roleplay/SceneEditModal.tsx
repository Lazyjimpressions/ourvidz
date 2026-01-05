import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [priority, setPriority] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (scene && isOpen) {
      setSceneName(scene.scene_name || '');
      setSceneDescription(scene.scene_description || '');
      setScenePrompt(scene.scene_prompt || '');
      setSceneRules(scene.scene_rules || '');
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
      const { data, error } = await supabase
        .from('character_scenes')
        .update({
          scene_name: sceneName.trim(),
          scene_description: sceneDescription.trim() || null,
          scene_prompt: scenePrompt.trim(),
          scene_rules: sceneRules.trim() || null,
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-background border-border text-foreground max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Edit Scene</DialogTitle>
        </DialogHeader>

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
      </DialogContent>
    </Dialog>
  );
};

