
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Clock, Trash2 } from "lucide-react";
import { WorkspaceImageGallery } from "@/components/WorkspaceImageGallery";
import { WorkspaceVideoDisplay } from "@/components/WorkspaceVideoDisplay";
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
}

interface WorkspaceGenerationSetsProps {
  generationSets: GenerationSet[];
  onRemoveSet: (setId: string) => void;
  onRegenerateItem: (itemId: string) => void;
  onClearAll: () => void;
}

export const WorkspaceGenerationSets = ({ 
  generationSets, 
  onRemoveSet, 
  onRegenerateItem, 
  onClearAll 
}: WorkspaceGenerationSetsProps) => {
  const [expandedSets, setExpandedSets] = useState<Set<string>>(
    new Set(generationSets.map(set => set.id)) // Start with all sets expanded
  );

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

  return (
    <div className="w-full max-w-6xl space-y-6">
      {/* Header with Clear All button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-medium text-white">Generated Content</h2>
        {generationSets.length > 0 && (
          <Button
            variant="outline"
            onClick={onClearAll}
            className="border-red-600 text-red-400 hover:bg-red-600/10"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      {/* Generation Sets */}
      <div className="space-y-4">
        {generationSets.map((set) => {
          const isExpanded = expandedSets.has(set.id);
          const contentCount = set.content.length;
          
          return (
            <Card key={set.id} className="bg-gray-900 border-gray-700">
              <Collapsible open={isExpanded} onOpenChange={() => toggleSetExpansion(set.id)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="flex items-start gap-2 text-left flex-1 justify-start p-0 h-auto min-h-[40px]">
                        <div className="flex-shrink-0 mt-1">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-white text-lg leading-relaxed break-words">
                            {set.prompt}
                          </CardTitle>
                        </div>
                      </Button>
                    </CollapsibleTrigger>
                    
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
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="pt-0">
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
          <p className="text-gray-400 text-lg">
            No generated content yet. Create your first generation to get started!
          </p>
        </div>
      )}
    </div>
  );
};
