
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Clock, Trash2, Info, RotateCcw } from "lucide-react";
import { WorkspaceImageGallery } from "@/components/WorkspaceImageGallery";
import { WorkspaceVideoDisplay } from "@/components/WorkspaceVideoDisplay";
import { PromptInfoModal } from "@/components/PromptInfoModal";
import { useIsMobile } from "@/hooks/use-mobile";
import type { GenerationQuality } from "@/types/generation";

interface GeneratedContent {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
  quality: GenerationQuality;
}

interface GenerationSet {
  id: string;
  prompt: string;
  quality: GenerationQuality;
  mode: 'image' | 'video';
  timestamp: Date;
  content: GeneratedContent[];
  isExpanded?: boolean;
  isRegeneration?: boolean;
  sourceSetId?: string;
}

interface WorkspaceGenerationSetsProps {
  generationSets: GenerationSet[];
  onRemoveSet: (setId: string) => void;
  onRegenerateItem: (itemId: string) => void;
  onClearAll: () => void;
  onRegenerateWithPrompt?: (params: {
    itemId: string;
    prompt: string;
    quality: GenerationQuality;
    mode: 'image' | 'video';
    strength?: number;
    referenceImageUrl?: string;
    preserveSeed?: boolean;
  }) => void;
}

export const WorkspaceGenerationSets = ({ 
  generationSets, 
  onRemoveSet, 
  onRegenerateItem, 
  onClearAll,
  onRegenerateWithPrompt
}: WorkspaceGenerationSetsProps) => {
  const [expandedSets, setExpandedSets] = useState<Set<string>>(
    new Set(generationSets.map(set => set.id)) // Start with all sets expanded
  );
  const [selectedPromptInfo, setSelectedPromptInfo] = useState<GenerationSet | null>(null);
  const isMobile = useIsMobile();

  const toggleSetExpansion = (setId: string) => {
    const newExpanded = new Set(expandedSets);
    if (newExpanded.has(setId)) {
      newExpanded.delete(setId);
    } else {
      newExpanded.add(setId);
    }
    setExpandedSets(newExpanded);
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleString();
  };

  const getQualityColor = (quality: GenerationQuality) => {
    return quality === 'fast' ? 'bg-blue-600' : 'bg-purple-600';
  };

  const truncatePrompt = (prompt: string, maxLength: number = 100) => {
    if (prompt.length <= maxLength) return prompt;
    return prompt.substring(0, maxLength).trim() + '...';
  };

  const handleShowPromptInfo = (set: GenerationSet, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPromptInfo(set);
  };

  const handleRegenerateWithPrompt = (params: {
    itemId: string;
    prompt: string;
    quality: GenerationQuality;
    mode: 'image' | 'video';
    strength?: number;
    referenceImageUrl?: string;
    preserveSeed?: boolean;
  }) => {
    if (onRegenerateWithPrompt) {
      onRegenerateWithPrompt(params);
    }
  };

  return (
    <div className="w-full max-w-6xl space-y-6">
      {/* Header with Clear All button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-medium text-white">Generated Content</h2>
        {generationSets.length > 0 && (
          <Button
            variant="outline"
            onClick={onClearAll}
            className="border-red-600 text-red-400 hover:bg-red-600/10 text-sm sm:text-base"
          >
            <Trash2 className="w-4 h-4 mr-1 sm:mr-2" />
            Clear All
          </Button>
        )}
      </div>

      {/* Generation Sets */}
      <div className="space-y-4">
        {generationSets.map((set) => {
          const isExpanded = expandedSets.has(set.id);
          const contentCount = set.content.length;
          const truncatedPrompt = truncatePrompt(set.prompt, isMobile ? 60 : 100);
          
          return (
            <Card 
              key={set.id} 
              className={`bg-gray-900 border-gray-700 ${
                set.isRegeneration ? 'ml-4 sm:ml-8 border-l-4 border-l-blue-500/50' : ''
              }`}
            >
              <Collapsible open={isExpanded} onOpenChange={() => toggleSetExpansion(set.id)}>
                <CardHeader className={`pb-3 ${isMobile ? 'p-4' : ''}`}>
                  {isMobile ? (
                    // Mobile Layout - Stacked vertically
                    <div className="space-y-3">
                      {/* Top row: Expand button, regeneration indicator, and info icon */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="p-1 h-auto">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                          
                          {set.isRegeneration && (
                            <Badge variant="secondary" className="bg-blue-600/20 text-blue-400 text-xs">
                              <RotateCcw className="w-3 h-3 mr-1" />
                              Regenerated
                            </Badge>
                          )}
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleShowPromptInfo(set, e)}
                          className="text-gray-400 hover:text-white hover:bg-gray-800 p-2"
                        >
                          <Info className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {/* Middle row: Badges and metadata */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Badge className={`${getQualityColor(set.quality)} text-white text-xs`}>
                            {set.quality === 'fast' ? 'Fast' : 'High Quality'}
                          </Badge>
                          <Badge variant="secondary" className="bg-gray-700 text-gray-300 text-xs">
                            {contentCount} {set.mode === 'image' ? 'image' : 'video'}{contentCount !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveSet(set.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-600/10 p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {/* Bottom row: Timestamp */}
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimestamp(set.timestamp)}</span>
                      </div>
                    </div>
                  ) : (
                    // Desktop Layout - Original horizontal layout with regeneration indicators
                    <div className="flex items-center justify-between gap-4">
                      {/* Left side - Expand/Collapse and Prompt */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="flex-shrink-0 p-1 h-auto">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <CardTitle className="text-white text-lg leading-relaxed flex-1 min-w-0">
                              {truncatedPrompt}
                            </CardTitle>
                            
                            {set.isRegeneration && (
                              <Badge variant="secondary" className="bg-blue-600/20 text-blue-400 text-xs flex-shrink-0">
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Regenerated
                              </Badge>
                            )}
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleShowPromptInfo(set, e)}
                            className="flex-shrink-0 text-gray-400 hover:text-white hover:bg-gray-800 p-1"
                          >
                            <Info className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Right side - Badges and Actions */}
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <Badge className={`${getQualityColor(set.quality)} text-white text-xs`}>
                            {set.quality === 'fast' ? 'Fast' : 'High Quality'}
                          </Badge>
                          <Badge variant="secondary" className="bg-gray-700 text-gray-300 text-xs">
                            {contentCount} {set.mode === 'image' ? 'image' : 'video'}{contentCount !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span className="whitespace-nowrap">{formatTimestamp(set.timestamp)}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemoveSet(set.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-600/10 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className={`pt-0 ${isMobile ? 'p-4 pt-0' : ''}`}>
                    {set.mode === 'image' ? (
                      <WorkspaceImageGallery
                        images={set.content}
                        onRemove={() => onRemoveSet(set.id)}
                        onRegenerateItem={onRegenerateItem}
                      />
                    ) : (
                      set.content.length > 0 && (
                        <WorkspaceVideoDisplay
                          video={set.content[0]}
                          onRemove={() => onRemoveSet(set.id)}
                          onRegenerateItem={onRegenerateItem}
                        />
                      )
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {generationSets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-base sm:text-lg">
            No generated content yet. Create your first generation to get started!
          </p>
        </div>
      )}

      {/* Enhanced Prompt Info Modal */}
      {selectedPromptInfo && (
        <PromptInfoModal
          isOpen={true}
          onClose={() => setSelectedPromptInfo(null)}
          prompt={selectedPromptInfo.prompt}
          quality={selectedPromptInfo.quality}
          mode={selectedPromptInfo.mode}
          timestamp={selectedPromptInfo.timestamp}
          contentCount={selectedPromptInfo.content.length}
          itemId={selectedPromptInfo.id}
          originalImageUrl={selectedPromptInfo.mode === 'image' && selectedPromptInfo.content.length > 0 ? selectedPromptInfo.content[0].url : undefined}
          onRegenerate={handleRegenerateWithPrompt}
        />
      )}
    </div>
  );
};
