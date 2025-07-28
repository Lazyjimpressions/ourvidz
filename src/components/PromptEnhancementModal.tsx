import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Clock, RotateCcw, Wifi, WifiOff, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWorkerStatus } from '@/hooks/useWorkerStatus';
import { GenerationFormat } from '@/types/generation';

interface PromptEnhancementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateWithEnhancement: (data: {
    originalPrompt: string;
    enhancedPrompt: string;
    enhancementMetadata: EnhancementMetadata;
    selectedPresets: string[];
  }) => void;
  originalPrompt: string;
  jobType: string;
  format: string;
  quality: 'fast' | 'high';
  selectedModel?: 'qwen_base' | 'qwen_instruct';
  generationFormat: GenerationFormat;
}

interface EnhancementMetadata {
  original_length: number;
  enhanced_length: number;
  expansion_percentage: string;
  job_type: string;
  format: string;
  quality: string;
  is_sdxl: boolean;
  is_video: boolean;
  enhancement_strategy: string;
  model_used: string;
  token_count: number;
  compression_applied: boolean;
  fallback_reason?: string;
  token_optimization?: {
    original: number;
    enhanced: number;
    final: number;
    target: number;
  };
  version?: string;
}

interface EnhancementResult {
  success: boolean;
  original_prompt: string;
  enhanced_prompt: string;
  enhancement_metadata: EnhancementMetadata;
}

export const PromptEnhancementModal: React.FC<PromptEnhancementModalProps> = ({
  isOpen,
  onClose,
  onGenerateWithEnhancement,
  originalPrompt: initialOriginalPrompt,
  jobType,
  format,
  quality,
  selectedModel = 'qwen_base',
  generationFormat
}) => {
  const [originalPrompt, setOriginalPrompt] = useState(initialOriginalPrompt);
  const [enhancedPrompt, setEnhancedPrompt] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPresets, setSelectedPresets] = useState<string[]>([]);
  const [enhancementResult, setEnhancementResult] = useState<EnhancementResult | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);

  // Update original prompt when initialOriginalPrompt changes
  React.useEffect(() => {
    setOriginalPrompt(initialOriginalPrompt);
  }, [initialOriginalPrompt]);
  const { toast } = useToast();
  const { chatWorker, wanWorker, isLoading: statusLoading } = useWorkerStatus();

  const presetOptions = [
    { id: 'quality', tag: 'best quality', label: 'Best Quality' },
    { id: 'professional', tag: 'professional photography', label: 'Professional' },
    { id: 'cinematic', tag: 'cinematic lighting', label: 'Cinematic' },
    { id: 'detailed', tag: 'highly detailed', label: 'Highly Detailed' }
  ];

  const enhancePrompt = useCallback(async () => {
    if (!originalPrompt.trim()) return;
    
    setIsEnhancing(true);
    setError(null);
    
    // Set estimated time based on model and worker status
    if (selectedModel === 'qwen_instruct') {
      setEstimatedTime(chatWorker.isHealthy ? 3 : 8);
    } else {
      setEstimatedTime(wanWorker.isHealthy ? 6 : 12);
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('enhance-prompt', {
        body: {
          prompt: originalPrompt,
          jobType,
          format,
          quality,
          selectedModel,
          selectedPresets
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to enhance prompt');
      }

      setEnhancementResult(data);
      setEnhancedPrompt(data.enhanced_prompt);
      
      toast({
        title: "Prompt Enhanced",
        description: `Enhanced using ${data.enhancement_metadata.model_used}`,
      });
    } catch (err) {
      console.error('Prompt enhancement failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to enhance prompt');
      toast({
        title: "Enhancement Failed",
        description: "Please try again or use the original prompt",
        variant: "destructive",
      });
    } finally {
      setIsEnhancing(false);
    }
  }, [originalPrompt, selectedPresets, jobType, format, quality, selectedModel, chatWorker.isHealthy, wanWorker.isHealthy, toast]);

  const handlePresetChange = (presetId: string, checked: boolean) => {
    setSelectedPresets(prev => 
      checked 
        ? [...prev, presetId]
        : prev.filter(id => id !== presetId)
    );
  };

  const handleGenerateWithEnhancement = async () => {
    if (!enhancedPrompt.trim() || !enhancementResult) return;
    
    setIsGenerating(true);
    
    try {
      await onGenerateWithEnhancement({
        originalPrompt,
        enhancedPrompt,
        enhancementMetadata: enhancementResult.enhancement_metadata,
        selectedPresets
      });
      
      toast({
        title: "Generation Started",
        description: "Your enhanced generation has been queued",
      });
      
      onClose();
    } catch (error) {
      console.error('Generation failed:', error);
      toast({
        title: "Generation Failed", 
        description: error instanceof Error ? error.message : "Failed to start generation",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = () => {
    setEnhancedPrompt('');
    setEnhancementResult(null);
    enhancePrompt();
  };

  const handleClose = () => {
    setOriginalPrompt(initialOriginalPrompt);
    setEnhancedPrompt('');
    setEnhancementResult(null);
    setError(null);
    setSelectedPresets([]);
    setIsEnhancing(false);
    setIsGenerating(false);
    onClose();
  };

  const canEnhance = originalPrompt.trim() && !isEnhancing;
  const canGenerate = enhancedPrompt.trim() && enhancementResult && !isGenerating;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Enhance & Generate
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={selectedModel === 'qwen_instruct' ? 'default' : 'secondary'}>
                {selectedModel === 'qwen_instruct' ? 'Fast Enhancement' : 'Standard Enhancement'}
              </Badge>
              {!statusLoading && (
                <div className="flex items-center gap-1 text-sm">
                  {selectedModel === 'qwen_instruct' 
                    ? (chatWorker.isHealthy ? <Wifi className="h-3 w-3 text-green-500" /> : <WifiOff className="h-3 w-3 text-red-500" />)
                    : (wanWorker.isHealthy ? <Wifi className="h-3 w-3 text-green-500" /> : <WifiOff className="h-3 w-3 text-red-500" />)
                  }
                </div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Original Prompt - Now Editable */}
          <div>
            <h3 className="text-sm font-medium mb-2">Original Prompt</h3>
            <Textarea
              value={originalPrompt}
              onChange={(e) => setOriginalPrompt(e.target.value)}
              className="min-h-[80px]"
              placeholder="Enter your original prompt..."
              disabled={isEnhancing || isGenerating}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Edit to break caching and create different variations
            </p>
          </div>

          {/* Preset Options - Optional enhancements */}
          <div>
            <h4 className="text-sm font-medium mb-2">Enhancement Presets (Optional)</h4>
            <div className="grid grid-cols-2 gap-2">
              {presetOptions.map(option => (
                <div key={option.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={option.id}
                    checked={selectedPresets.includes(option.id)}
                    onCheckedChange={(checked) => handlePresetChange(option.id, checked as boolean)}
                    disabled={isEnhancing || isGenerating}
                  />
                  <label htmlFor={option.id} className="text-sm">{option.label}</label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Select presets to apply additional enhancements (optional)
            </p>
          </div>

          {/* Enhancement Button */}
          <div className="flex justify-center">
            <Button 
              onClick={enhancePrompt}
              disabled={!canEnhance}
              variant="outline"
              className="w-full max-w-md"
            >
              {isEnhancing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enhancing...
                  {estimatedTime && (
                    <span className="ml-2 text-xs">~{estimatedTime}s</span>
                  )}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Enhance Prompt
                </>
              )}
            </Button>
          </div>

          {/* Enhancement Loading State */}
          {isEnhancing && (
            <div className="flex flex-col items-center justify-center py-4 space-y-2">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Enhancing your prompt with {selectedModel === 'qwen_instruct' ? 'Fast' : 'Standard'} enhancement...
                </p>
                {!chatWorker.isHealthy && selectedModel === 'qwen_instruct' && (
                  <p className="text-xs text-amber-600 mt-1">
                    Fast worker unavailable, using fallback method
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isEnhancing && (
            <div className="text-center py-4">
              <p className="text-destructive font-medium mb-2">Enhancement Failed</p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={enhancePrompt} variant="outline" disabled={!canEnhance}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}

          {/* Enhanced Prompt */}
          {enhancementResult && (
            <>
              <div>
                <h3 className="text-sm font-medium mb-2">Enhanced Prompt</h3>
                <Textarea
                  value={enhancedPrompt}
                  onChange={(e) => setEnhancedPrompt(e.target.value)}
                  className="min-h-[120px]"
                  placeholder="Enhanced prompt will appear here..."
                  disabled={isGenerating}
                />
              </div>

              {/* Enhancement Metadata */}
              <div className="bg-muted/50 p-3 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Model:</span>
                    <span className="ml-2 font-medium">{enhancementResult.enhancement_metadata.model_used}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Strategy:</span>
                    <span className="ml-2 font-medium">{enhancementResult.enhancement_metadata.enhancement_strategy}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Version:</span>
                    <span className="ml-2 font-medium">{enhancementResult.enhancement_metadata.version || '2.1'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expansion:</span>
                    <span className="ml-2 font-medium">{enhancementResult.enhancement_metadata.expansion_percentage}%</span>
                  </div>
                </div>
                
                {/* Token Optimization Details */}
                {enhancementResult.enhancement_metadata.token_optimization && (
                  <div className="border-t pt-2">
                    <h5 className="text-xs font-medium text-muted-foreground mb-2">Token Optimization</h5>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Original:</span>
                        <span className="ml-2 font-medium">{enhancementResult.enhancement_metadata.token_optimization.original}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Enhanced:</span>
                        <span className="ml-2 font-medium">{enhancementResult.enhancement_metadata.token_optimization.enhanced}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Final:</span>
                        <span className="ml-2 font-medium">{enhancementResult.enhancement_metadata.token_optimization.final}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Target:</span>
                        <span className="ml-2 font-medium">{enhancementResult.enhancement_metadata.token_optimization.target}</span>
                      </div>
                    </div>
                    {enhancementResult.enhancement_metadata.compression_applied && (
                      <div className="mt-2">
                        <Badge variant="secondary" className="text-xs">
                          🔧 Compression Applied
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
                
                {enhancementResult.enhancement_metadata.fallback_reason && (
                  <div className="border-t pt-2">
                    <Badge variant="outline" className="text-xs">
                      ⚠️ Fallback: {enhancementResult.enhancement_metadata.fallback_reason}
                    </Badge>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={handleClose} disabled={isEnhancing || isGenerating}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {enhancementResult && (
              <Button variant="outline" onClick={handleRegenerate} disabled={isEnhancing || isGenerating || !canEnhance}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
            )}
            <Button 
              onClick={handleGenerateWithEnhancement} 
              disabled={!canGenerate}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Generate with Enhancement
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};