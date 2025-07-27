import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { Loader2, Sparkles, Check, X, RefreshCw, ArrowRight } from 'lucide-react'
import { supabase } from '../integrations/supabase/client'

interface PromptEnhancementModalProps {
  isOpen: boolean
  onClose: () => void
  onAccept: (enhancedPrompt: string) => void
  originalPrompt: string
  jobType: string
  format: 'image' | 'video'
  quality: 'fast' | 'high'
  selectedModel?: 'qwen_base' | 'qwen_instruct'
}

interface EnhancementResult {
  success: boolean
  original_prompt: string
  enhanced_prompt: string
  enhancement_metadata: {
    original_length: number
    enhanced_length: number
    expansion_percentage: string
    job_type: string
    format: string
    quality: string
    is_sdxl: boolean
    is_video: boolean
    enhancement_strategy: string
    model_used: string
    token_count: number
    compression_applied: boolean
    fallback_reason?: string
  }
}

export function PromptEnhancementModal({
  isOpen,
  onClose,
  onAccept,
  originalPrompt,
  jobType,
  format,
  quality,
  selectedModel = 'qwen_base'
}: PromptEnhancementModalProps) {
  const [enhancedPrompt, setEnhancedPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enhancementMetadata, setEnhancementMetadata] = useState<any>(null)

  // Preset tags and state
  const PRESET_OPTIONS = [
    { label: 'Best Quality', tag: 'best quality' },
    { label: 'Professional Photography', tag: 'professional photography' },
    { label: 'Perfect Anatomy', tag: 'perfect anatomy' },
    { label: 'Cinematic Lighting', tag: 'cinematic lighting' },
  ];
  const [selectedPresets, setSelectedPresets] = useState<string[]>([]);

  // Token count (word count as proxy)
  const getTokenCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
  const tokenCount = getTokenCount(enhancedPrompt);

  // Auto-enhance when modal opens
  useEffect(() => {
    if (isOpen && originalPrompt && !enhancedPrompt) {
      enhancePrompt()
    }
  }, [isOpen, originalPrompt])

  // Update enhanced prompt when presets change
  useEffect(() => {
    if (!enhancedPrompt) return;
    let prompt = enhancedPrompt;
    // Remove all preset tags first
    PRESET_OPTIONS.forEach(opt => {
      const regex = new RegExp(`\\b${opt.tag}\\b`, 'gi');
      prompt = prompt.replace(regex, '').replace(/,\s*,/g, ',').replace(/^,|,$/g, '').replace(/\s+,/g, ',').replace(/,\s+/g, ', ');
    });
    // Add selected preset tags at the start
    const tagsToAdd = PRESET_OPTIONS.filter(opt => selectedPresets.includes(opt.label)).map(opt => opt.tag);
    let newPrompt = tagsToAdd.length > 0 ? tagsToAdd.join(', ') + (prompt.trim() ? ', ' + prompt.trim() : '') : prompt.trim();
    // Clean up extra commas/spaces
    newPrompt = newPrompt.replace(/,\s*,/g, ',').replace(/^,|,$/g, '').replace(/\s+,/g, ',').replace(/,\s+/g, ', ');
    setEnhancedPrompt(newPrompt);
    // eslint-disable-next-line
  }, [selectedPresets]);

  const handlePresetChange = (label: string, checked: boolean) => {
    setSelectedPresets(prev =>
      checked ? [...prev, label] : prev.filter(l => l !== label)
    );
  };

  const enhancePrompt = async () => {
    if (!originalPrompt.trim()) return
    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.functions.invoke('enhance-prompt', {
        body: {
          prompt: originalPrompt,
          jobType,
          format,
          quality,
          selectedModel
        }
      })
      if (error) {
        throw new Error(error.message)
      }
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to enhance prompt')
      }
      const result: EnhancementResult = data
      setEnhancedPrompt(result.enhanced_prompt)
      setEnhancementMetadata(result.enhancement_metadata)
      // Reset presets on new enhancement
      setSelectedPresets([]);
      console.log('✅ Prompt enhanced successfully:', {
        originalLength: result.enhancement_metadata.original_length,
        enhancedLength: result.enhancement_metadata.enhanced_length,
        expansion: result.enhancement_metadata.expansion_percentage + '%',
        strategy: result.enhancement_metadata.enhancement_strategy
      })
    } catch (err) {
      console.error('❌ Prompt enhancement failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to enhance prompt')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAccept = () => {
    if (enhancedPrompt.trim() && tokenCount <= 77) {
      onAccept(enhancedPrompt)
      onClose()
    }
  }

  const handleRegenerate = () => {
    setEnhancedPrompt('')
    setEnhancementMetadata(null)
    setSelectedPresets([]);
    enhancePrompt()
  }

  const handleClose = () => {
    setEnhancedPrompt('')
    setEnhancementMetadata(null)
    setError(null)
    setSelectedPresets([]);
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-800 max-w-4xl w-full max-h-[80vh] flex flex-col">
        {/* Header (sticky) */}
        <div className="flex-shrink-0 p-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Enhance Prompt</h2>
                {enhancementMetadata && (
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-xs bg-green-600/20 text-green-400 border-green-600/30">
                      {enhancementMetadata.model_used}
                    </Badge>
                    {enhancementMetadata.compression_applied && (
                      <Badge variant="secondary" className="text-xs bg-yellow-600/20 text-yellow-400 border-yellow-600/30">
                        Compressed
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose} className="text-gray-400 hover:text-white">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-400" />
                <p className="text-gray-400">Enhancing your prompt...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <X className="h-8 w-8 text-red-400 mx-auto mb-4" />
              <p className="text-red-400 font-medium mb-2">Enhancement Failed</p>
              <p className="text-sm text-gray-400 mb-4">{error}</p>
              <Button onClick={enhancePrompt} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Original Prompt */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-300">Original Prompt</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{originalPrompt.length} chars</span>
                    <span>•</span>
                    <span>{originalPrompt.split(' ').length} words</span>
                  </div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                  <p className="text-white text-sm font-mono">{originalPrompt}</p>
                </div>
              </div>

              {/* Preset Checkboxes - responsive */}
              <div className="flex flex-wrap gap-4 items-center mb-2 sm:flex-row flex-col">
                {PRESET_OPTIONS.map(opt => (
                  <label key={opt.label} className="flex items-center text-xs text-gray-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedPresets.includes(opt.label)}
                      onChange={e => handlePresetChange(opt.label, e.target.checked)}
                      className="mr-1 accent-purple-600"
                      style={{ width: 12, height: 12 }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>

              {/* Enhanced Prompt */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-300">Enhanced Version</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{enhancedPrompt.length} chars</span>
                    <span>•</span>
                    <span>{enhancedPrompt.split(' ').length} words</span>
                    <span>•</span>
                    <span style={{ color: tokenCount > 77 ? '#f87171' : tokenCount > 65 ? '#facc15' : undefined }}>
                      {tokenCount} tokens
                    </span>
                  </div>
                </div>
                <Textarea
                  value={enhancedPrompt}
                  onChange={(e) => setEnhancedPrompt(e.target.value)}
                  className="min-h-[80px] bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 font-mono text-sm resize-none"
                  placeholder="AI-enhanced prompt will appear here..."
                />
              </div>

              {/* Enhancement Stats - responsive */}
              {enhancementMetadata && (
                <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                  <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-2 grid-cols-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Model Used:</span>
                      <span className="text-green-400 font-medium">{enhancementMetadata.model_used}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Token Count:</span>
                      <span className={`font-medium ${enhancementMetadata.token_count > 77 ? 'text-red-400' : enhancementMetadata.token_count > 65 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {enhancementMetadata.token_count}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Expansion:</span>
                      <span className="text-purple-400 font-medium">{enhancementMetadata.expansion_percentage}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Quality:</span>
                      <span className="text-blue-400 font-medium capitalize">{enhancementMetadata.quality}</span>
                    </div>
                    {enhancementMetadata.compression_applied && (
                      <div className="flex justify-between col-span-2">
                        <span className="text-gray-400">Compression:</span>
                        <span className="text-yellow-400 font-medium">Applied for SDXL token limit</span>
                      </div>
                    )}
                    {enhancementMetadata.fallback_reason && (
                      <div className="flex justify-between col-span-2">
                        <span className="text-gray-400">Fallback:</span>
                        <span className="text-orange-400 font-medium">{enhancementMetadata.fallback_reason}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer (sticky) */}
        <div className="flex-shrink-0 p-4 border-t border-gray-800 bg-gray-900/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-xs text-gray-400">
              Edit the enhanced prompt to your liking, then apply to use it for generation.
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleClose} className="text-gray-400 border-gray-600">
                Cancel
              </Button>
              <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={isLoading} className="text-gray-400 border-gray-600">
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
              <Button 
                onClick={handleAccept} 
                disabled={isLoading || !enhancedPrompt.trim() || tokenCount > 77}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Check className="h-4 w-4 mr-2" />
                Apply Enhanced
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 