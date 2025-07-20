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
  }
}

export function PromptEnhancementModal({
  isOpen,
  onClose,
  onAccept,
  originalPrompt,
  jobType,
  format,
  quality
}: PromptEnhancementModalProps) {
  const [enhancedPrompt, setEnhancedPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enhancementMetadata, setEnhancementMetadata] = useState<any>(null)

  // Auto-enhance when modal opens
  useEffect(() => {
    if (isOpen && originalPrompt && !enhancedPrompt) {
      enhancePrompt()
    }
  }, [isOpen, originalPrompt])

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
          quality
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
    if (enhancedPrompt.trim()) {
      onAccept(enhancedPrompt)
      onClose()
    }
  }

  const handleRegenerate = () => {
    setEnhancedPrompt('')
    setEnhancementMetadata(null)
    enhancePrompt()
  }

  const handleClose = () => {
    setEnhancedPrompt('')
    setEnhancementMetadata(null)
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-800 max-w-4xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Enhance Prompt</h2>
              {enhancementMetadata && (
                <Badge variant="secondary" className="text-xs bg-green-600/20 text-green-400 border-green-600/30">
                  {enhancementMetadata.enhancement_strategy}
                </Badge>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose} className="text-gray-400 hover:text-white">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
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
            <div className="space-y-6">
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

              {/* Arrow */}
              <div className="flex justify-center">
                <ArrowRight className="h-5 w-5 text-purple-400" />
              </div>

              {/* Enhanced Prompt */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-300">Enhanced Version</h3>
                  {enhancementMetadata && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{enhancementMetadata.enhanced_length} chars</span>
                      <span>•</span>
                      <span>{enhancementMetadata.expansion_percentage}% expansion</span>
                      <span>•</span>
                      <span>{enhancedPrompt.split(' ').length} words</span>
                    </div>
                  )}
                </div>
                <Textarea
                  value={enhancedPrompt}
                  onChange={(e) => setEnhancedPrompt(e.target.value)}
                  className="min-h-[80px] bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 font-mono text-sm resize-none"
                  placeholder="AI-enhanced prompt will appear here..."
                />
              </div>

              {/* Enhancement Stats */}
              {enhancementMetadata && (
                <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Expansion:</span>
                      <span className="text-purple-400 font-medium">{enhancementMetadata.expansion_percentage}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Strategy:</span>
                      <span className="text-green-400 font-medium">{enhancementMetadata.enhancement_strategy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Job Type:</span>
                      <span className="text-blue-400 font-medium">{enhancementMetadata.job_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Quality:</span>
                      <span className="text-yellow-400 font-medium capitalize">{enhancementMetadata.quality}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-800 bg-gray-900/50">
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
              disabled={isLoading || !enhancedPrompt.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Check className="h-4 w-4 mr-2" />
              Apply Enhanced
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 