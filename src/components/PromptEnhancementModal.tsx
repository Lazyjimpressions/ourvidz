import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { Loader2, Sparkles, Check, X, RefreshCw } from 'lucide-react'
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">Enhance Prompt</h2>
            {enhancementMetadata && (
              <Badge variant="secondary" className="ml-2">
                {enhancementMetadata.enhancement_strategy}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row h-[calc(90vh-140px)]">
          {/* Left Side - Original Prompt */}
          <div className="flex-1 p-6 border-r">
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">Original Prompt</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{originalPrompt.length} characters</span>
                <span>•</span>
                <span>{originalPrompt.split(' ').length} words</span>
              </div>
            </div>
            <Textarea
              value={originalPrompt}
              readOnly
              className="h-full resize-none font-mono text-sm"
              placeholder="Your original prompt..."
            />
          </div>

          {/* Right Side - Enhanced Prompt */}
          <div className="flex-1 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">AI Enhanced Version</h3>
              {enhancementMetadata && (
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{enhancementMetadata.enhanced_length} characters</span>
                  <span>•</span>
                  <span>{enhancementMetadata.enhanced_length > 0 ? Math.round(enhancementMetadata.enhanced_length / originalPrompt.length * 100) : 0}% expansion</span>
                  <span>•</span>
                  <span>{enhancementMetadata.enhanced_prompt?.split(' ').length || 0} words</span>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">Enhancing your prompt...</p>
                </div>
              </div>
            ) : error ? (
              <Card className="h-full border-destructive">
                <CardContent className="flex flex-col items-center justify-center h-full text-center">
                  <X className="h-8 w-8 text-destructive mb-4" />
                  <p className="text-destructive font-medium mb-2">Enhancement Failed</p>
                  <p className="text-sm text-muted-foreground mb-4">{error}</p>
                  <Button onClick={enhancePrompt} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <Textarea
                  value={enhancedPrompt}
                  onChange={(e) => setEnhancedPrompt(e.target.value)}
                  className="h-full resize-none font-mono text-sm mb-4"
                  placeholder="AI-enhanced prompt will appear here..."
                />

                {/* Enhancement Stats */}
                {enhancementMetadata && (
                  <Card className="mb-4">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Enhancement Details</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Expansion:</span>
                          <span className="ml-2 font-medium">{enhancementMetadata.expansion_percentage}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Strategy:</span>
                          <span className="ml-2 font-medium">{enhancementMetadata.enhancement_strategy}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Job Type:</span>
                          <span className="ml-2 font-medium">{enhancementMetadata.job_type}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Quality:</span>
                          <span className="ml-2 font-medium capitalize">{enhancementMetadata.quality}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-muted/50">
          <div className="text-sm text-muted-foreground">
            Edit the enhanced prompt to your liking, then accept to use it for generation.
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handleRegenerate} disabled={isLoading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate
            </Button>
            <Button 
              onClick={handleAccept} 
              disabled={isLoading || !enhancedPrompt.trim()}
              className="min-w-[120px]"
            >
              <Check className="h-4 w-4 mr-2" />
              Use Enhanced
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 