
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { X, Copy, Clock, Edit3, Save, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import type { GenerationQuality } from "@/types/generation";

interface PromptInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
  quality: GenerationQuality;
  mode: 'image' | 'video';
  timestamp: Date;
  contentCount: number;
  itemId?: string;
  originalImageUrl?: string;
  onRegenerate?: (params: {
    itemId: string;
    prompt: string;
    quality: GenerationQuality;
    mode: 'image' | 'video';
    strength?: number;
    referenceImageUrl?: string;
    preserveSeed?: boolean;
  }) => void;
}

export const PromptInfoModal = ({ 
  isOpen, 
  onClose, 
  prompt: initialPrompt, 
  quality, 
  mode, 
  timestamp, 
  contentCount,
  itemId,
  originalImageUrl,
  onRegenerate
}: PromptInfoModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(initialPrompt);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [strength, setStrength] = useState([0.8]);
  const [useAsReference, setUseAsReference] = useState(true);
  const [preserveSeed, setPreserveSeed] = useState(false);

  const hasUnsavedChanges = editedPrompt !== initialPrompt;
  const canRegenerate = itemId && onRegenerate && hasUnsavedChanges;

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(editedPrompt);
      toast.success('Prompt copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy prompt:', error);
      toast.error('Failed to copy prompt');
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedPrompt(initialPrompt);
    setIsEditing(false);
    setShowAdvanced(false);
  };

  const handleSave = () => {
    setIsEditing(false);
    setShowAdvanced(false);
  };

  const handleRegenerate = () => {
    if (!canRegenerate) return;

    const params = {
      itemId: itemId!,
      prompt: editedPrompt,
      quality,
      mode,
      strength: strength[0],
      referenceImageUrl: (useAsReference && originalImageUrl) ? originalImageUrl : undefined,
      preserveSeed
    };

    onRegenerate(params);
    onClose();
    toast.success('Regenerating with updated prompt...');
  };

  const handleClose = () => {
    if (hasUnsavedChanges && isEditing) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        handleCancel();
        onClose();
      }
    } else {
      onClose();
    }
  };

  const getQualityColor = (quality: GenerationQuality) => {
    return quality === 'fast' ? 'bg-blue-600' : 'bg-purple-600';
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-gray-900 border-gray-700 text-white p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            {isEditing ? 'Edit Generation' : 'Generation Details'}
          </h2>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                className="text-gray-400 hover:text-white hover:bg-gray-800 p-2"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Prompt Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-300">Prompt</h3>
              <div className="flex items-center gap-2">
                {isEditing && (
                  <span className="text-xs text-gray-400">
                    {editedPrompt.length}/4000
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyPrompt}
                  className="text-gray-400 hover:text-white hover:bg-gray-800 text-xs"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg border border-gray-700">
              {isEditing ? (
                <Textarea
                  value={editedPrompt}
                  onChange={(e) => setEditedPrompt(e.target.value)}
                  className="bg-transparent border-none text-white resize-none min-h-[120px] p-4"
                  placeholder="Enter your prompt..."
                  maxLength={4000}
                />
              ) : (
                <p className="text-white leading-relaxed whitespace-pre-wrap break-words p-4">
                  {editedPrompt}
                </p>
              )}
            </div>
          </div>

          {/* Advanced Regeneration Controls */}
          {isEditing && canRegenerate && (
            <div className="space-y-3">
              <Button
                variant="ghost"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-gray-400 hover:text-white p-0 h-auto"
              >
                Advanced Options
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
              
              {showAdvanced && (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-4">
                  {/* Strength Control */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-300">Similarity Strength</label>
                      <span className="text-xs text-gray-400">{strength[0].toFixed(1)}</span>
                    </div>
                    <Slider
                      value={strength}
                      onValueChange={setStrength}
                      min={0.5}
                      max={0.95}
                      step={0.05}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      Higher values keep the result closer to the original
                    </p>
                  </div>

                  {/* Reference Image Toggle - Only for images */}
                  {mode === 'image' && originalImageUrl && (
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <label className="text-sm text-gray-300">Use Original as Reference</label>
                        <p className="text-xs text-gray-500">
                          Uses the original image to guide the new generation
                        </p>
                      </div>
                      <Switch
                        checked={useAsReference}
                        onCheckedChange={setUseAsReference}
                      />
                    </div>
                  )}

                  {/* Preserve Seed Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <label className="text-sm text-gray-300">Preserve Seed</label>
                      <p className="text-xs text-gray-500">
                        Attempts to use the same random seed for consistency
                      </p>
                    </div>
                    <Switch
                      checked={preserveSeed}
                      onCheckedChange={setPreserveSeed}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Metadata Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-300">Generation Info</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Quality:</span>
                  <Badge className={`${getQualityColor(quality)} text-white text-xs`}>
                    {quality === 'fast' ? 'Fast' : 'High Quality'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Type:</span>
                  <Badge variant="secondary" className="bg-gray-700 text-gray-300 text-xs">
                    {contentCount} {mode === 'image' ? 'image' : 'video'}{contentCount !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span className="text-sm text-gray-400">Generated:</span>
                </div>
                <p className="text-sm text-white pl-5">
                  {formatTimestamp(timestamp)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        {isEditing && (
          <div className="flex items-center justify-between p-6 border-t border-gray-700">
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="text-gray-400 hover:text-white"
            >
              Cancel
            </Button>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={handleSave}
                className="text-white hover:bg-gray-700"
              >
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
              
              {canRegenerate && (
                <Button
                  onClick={handleRegenerate}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Update & Regenerate
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
