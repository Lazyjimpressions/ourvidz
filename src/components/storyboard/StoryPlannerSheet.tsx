/**
 * StoryPlannerSheet Component
 *
 * AI-powered story planning sheet. Users describe their video in natural language,
 * AI generates a structured scene breakdown, user reviews and applies.
 */

import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Sparkles,
  Loader2,
  Check,
  X,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CreateSceneInput } from '@/types/storyboard';
import { useToast } from '@/hooks/use-toast';

interface PlannedScene {
  title: string;
  description: string;
  setting: string;
  mood: string;
  duration: number;
  accepted: boolean;
}

interface StoryPlannerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  characterName?: string;
  characterDescription?: string;
  onApplyPlan: (scenes: CreateSceneInput[]) => Promise<void>;
}

export const StoryPlannerSheet: React.FC<StoryPlannerSheetProps> = ({
  isOpen,
  onClose,
  projectId,
  characterName,
  characterDescription,
  onApplyPlan,
}) => {
  const { toast } = useToast();
  const [narrative, setNarrative] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [plannedScenes, setPlannedScenes] = useState<PlannedScene[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleGeneratePlan = async () => {
    if (!narrative.trim()) return;

    setIsGenerating(true);
    setPlannedScenes([]);

    try {
      const { data, error } = await supabase.functions.invoke('playground-chat', {
        body: {
          system_prompt_override: `You are a cinematic storyboard planner. Given a video description, break it into 3-6 scenes. Return ONLY a JSON array (no markdown, no explanation) with objects containing: title (string), description (string, 1-2 sentences), setting (string, location), mood (string, one word), duration (number, seconds 3-10). Keep it concise and cinematic.`,
          messages: [
            {
              role: 'user',
              content: `Plan a storyboard for: "${narrative}"${characterName ? `\nMain character: ${characterName}${characterDescription ? ` - ${characterDescription}` : ''}` : ''}`,
            },
          ],
        },
      });

      if (error) throw error;

      const content = data?.content?.trim() || '';
      // Parse JSON from response (handle potential markdown wrapping)
      const jsonStr = content.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();
      const parsed = JSON.parse(jsonStr) as Array<{
        title: string;
        description: string;
        setting: string;
        mood: string;
        duration: number;
      }>;

      setPlannedScenes(
        parsed.map((s) => ({
          title: s.title || 'Untitled',
          description: s.description || '',
          setting: s.setting || '',
          mood: s.mood || 'natural',
          duration: s.duration || 5,
          accepted: true,
        }))
      );
    } catch (err) {
      console.error('Story planning failed:', err);
      toast({
        title: 'Planning failed',
        description: 'Could not generate scene breakdown. Try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = async () => {
    const accepted = plannedScenes.filter((s) => s.accepted);
    if (accepted.length === 0) return;

    setIsApplying(true);
    try {
      const sceneInputs: CreateSceneInput[] = accepted.map((s) => ({
        project_id: projectId,
        title: s.title,
        description: s.description,
        setting: s.setting,
        mood: s.mood,
        target_duration_seconds: s.duration,
      }));

      await onApplyPlan(sceneInputs);
      toast({ title: `${accepted.length} scenes created` });
      setPlannedScenes([]);
      setNarrative('');
      onClose();
    } catch (err) {
      console.error('Failed to apply plan:', err);
      toast({ title: 'Failed to create scenes', variant: 'destructive' });
    } finally {
      setIsApplying(false);
    }
  };

  const toggleScene = (index: number) => {
    setPlannedScenes((prev) =>
      prev.map((s, i) => (i === index ? { ...s, accepted: !s.accepted } : s))
    );
  };

  const removeScene = (index: number) => {
    setPlannedScenes((prev) => prev.filter((_, i) => i !== index));
  };

  const updateScene = (index: number, updates: Partial<PlannedScene>) => {
    setPlannedScenes((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...updates } : s))
    );
  };

  const acceptedCount = plannedScenes.filter((s) => s.accepted).length;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="bg-gray-950 border-gray-800 w-[400px] sm:w-[440px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            AI Story Planner
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Narrative input */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400">Describe your video</label>
            <Textarea
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="e.g. Maya at a pool party, starts relaxed by the pool, moves to the hot tub, playful mood builds to intimate..."
              className="min-h-[100px] text-xs bg-gray-900 border-gray-800 resize-none"
            />
            <Button
              className="w-full h-8 text-xs gap-1.5"
              onClick={handleGeneratePlan}
              disabled={!narrative.trim() || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Planning...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  Generate Plan
                </>
              )}
            </Button>
          </div>

          {/* Planned scenes */}
          {plannedScenes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {acceptedCount} of {plannedScenes.length} scenes selected
                </span>
              </div>

              <div className="space-y-2">
                {plannedScenes.map((scene, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border transition-all ${
                      scene.accepted
                        ? 'border-gray-700 bg-gray-900/50'
                        : 'border-gray-800/50 bg-gray-950 opacity-50'
                    }`}
                  >
                    {editingIndex === index ? (
                      <div className="space-y-2">
                        <Input
                          value={scene.title}
                          onChange={(e) => updateScene(index, { title: e.target.value })}
                          className="h-7 text-xs bg-gray-800 border-gray-700"
                        />
                        <Textarea
                          value={scene.description}
                          onChange={(e) => updateScene(index, { description: e.target.value })}
                          className="min-h-[40px] text-xs bg-gray-800 border-gray-700 resize-none"
                        />
                        <div className="flex gap-2">
                          <Input
                            value={scene.setting}
                            onChange={(e) => updateScene(index, { setting: e.target.value })}
                            placeholder="Setting"
                            className="h-7 text-xs bg-gray-800 border-gray-700 flex-1"
                          />
                          <Input
                            value={scene.mood}
                            onChange={(e) => updateScene(index, { mood: e.target.value })}
                            placeholder="Mood"
                            className="h-7 text-xs bg-gray-800 border-gray-700 w-24"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px]"
                          onClick={() => setEditingIndex(null)}
                        >
                          Done
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <button
                          className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                            scene.accepted
                              ? 'bg-primary border-primary'
                              : 'border-gray-600'
                          }`}
                          onClick={() => toggleScene(index)}
                        >
                          {scene.accepted && <Check className="w-3 h-3 text-primary-foreground" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-200 font-medium">
                            S{index + 1}: {scene.title}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {scene.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-600">
                            <span>{scene.setting}</span>
                            <span>·</span>
                            <span>{scene.mood}</span>
                            <span>·</span>
                            <span>{scene.duration}s</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-gray-500 hover:text-gray-300"
                            onClick={() => setEditingIndex(index)}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-gray-500 hover:text-red-400"
                            onClick={() => removeScene(index)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Apply button */}
              <Button
                className="w-full h-8 text-xs gap-1.5"
                onClick={handleApply}
                disabled={acceptedCount === 0 || isApplying}
              >
                {isApplying ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Creating scenes...
                  </>
                ) : (
                  <>
                    <Plus className="w-3 h-3" />
                    Apply Plan ({acceptedCount} scenes)
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default StoryPlannerSheet;
