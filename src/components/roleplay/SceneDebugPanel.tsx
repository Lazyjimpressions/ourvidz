import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Code, Database, Settings, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SceneDebugPanelProps {
  generationMetadata?: {
    template_name?: string;
    model_used?: string;
    model_display_name?: string;
    provider_name?: string;
    consistency_method?: string;
    reference_strength?: number;
    denoise_strength?: number;
    seed_locked?: number | boolean;
    original_prompt_length?: number;
    optimized_prompt_length?: number;
    estimated_tokens?: number;
    character_visual_description?: string;
    scene_context?: string;
    [key: string]: any;
  };
  sceneData?: {
    scene_prompt?: string;
    scene_type?: string;
    effective_image_model?: string;
    [key: string]: any;
  };
  className?: string;
}

export const SceneDebugPanel: React.FC<SceneDebugPanelProps> = ({
  generationMetadata,
  sceneData,
  className
}) => {
  if (!generationMetadata && !sceneData) {
    return null;
  }

  const metadata = generationMetadata || {};
  const scene = sceneData || {};

  return (
    <Card className={cn("p-4 bg-gray-900/80 border-gray-700", className)}>
      <div className="flex items-center gap-2 mb-3">
        <Code className="w-4 h-4 text-purple-400" />
        <Label className="text-sm font-medium text-purple-300">Admin Debug Info</Label>
      </div>

      <div className="space-y-3 text-xs">
        {/* Template & Model Info */}
        <div className="grid grid-cols-2 gap-3">
          {metadata.template_name && (
            <div>
              <Label className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Template
              </Label>
              <p className="text-gray-200 font-mono text-xs">{metadata.template_name}</p>
            </div>
          )}
          
          {metadata.model_display_name && (
            <div>
              <Label className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                <Database className="w-3 h-3" />
                Model
              </Label>
              <p className="text-gray-200 font-mono text-xs">{metadata.model_display_name}</p>
              {metadata.model_used && metadata.model_used !== metadata.model_display_name && (
                <p className="text-gray-400 text-xs mt-0.5">({metadata.model_used})</p>
              )}
            </div>
          )}
        </div>

        {/* Provider & Consistency */}
        <div className="grid grid-cols-2 gap-3">
          {metadata.provider_name && (
            <div>
              <Label className="text-xs text-gray-400 mb-1">Provider</Label>
              <Badge variant="outline" className="text-xs bg-gray-800 border-gray-600">
                {metadata.provider_name}
              </Badge>
            </div>
          )}
          
          {metadata.consistency_method && (
            <div>
              <Label className="text-xs text-gray-400 mb-1">Consistency</Label>
              <Badge variant="outline" className="text-xs bg-gray-800 border-gray-600">
                {metadata.consistency_method}
              </Badge>
            </div>
          )}
        </div>

        {/* Consistency Settings */}
        {(metadata.reference_strength !== undefined || metadata.denoise_strength !== undefined || metadata.seed_locked !== undefined) && (
          <div>
            <Label className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <Settings className="w-3 h-3" />
              Consistency Settings
            </Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {metadata.reference_strength !== undefined && (
                <Badge variant="outline" className="text-xs bg-gray-800 border-gray-600">
                  Ref: {Math.round(metadata.reference_strength * 100)}%
                </Badge>
              )}
              {metadata.denoise_strength !== undefined && (
                <Badge variant="outline" className="text-xs bg-gray-800 border-gray-600">
                  Denoise: {Math.round(metadata.denoise_strength * 100)}%
                </Badge>
              )}
              {metadata.seed_locked !== undefined && metadata.seed_locked !== null && (
                <Badge variant="outline" className="text-xs bg-gray-800 border-gray-600">
                  Seed: {typeof metadata.seed_locked === 'number' ? metadata.seed_locked : 'locked'}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Prompt Length Info */}
        {(metadata.original_prompt_length !== undefined || metadata.optimized_prompt_length !== undefined || metadata.estimated_tokens !== undefined) && (
          <div>
            <Label className="text-xs text-gray-400 mb-1">Prompt Length</Label>
            <div className="space-y-1">
              {metadata.original_prompt_length !== undefined && metadata.optimized_prompt_length !== undefined && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Original:</span>
                  <span className="text-gray-200">{metadata.original_prompt_length} chars</span>
                </div>
              )}
              {metadata.optimized_prompt_length !== undefined && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Optimized:</span>
                  <span className="text-gray-200">{metadata.optimized_prompt_length} chars</span>
                </div>
              )}
              {metadata.estimated_tokens !== undefined && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">CLIP Tokens:</span>
                  <span className={cn(
                    "text-gray-200",
                    metadata.estimated_tokens > 77 ? "text-amber-400" : "text-green-400"
                  )}>
                    {metadata.estimated_tokens} / 77
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scene Type & Model */}
        {(scene.scene_type || scene.effective_image_model) && (
          <div>
            <Label className="text-xs text-gray-400 mb-1">Scene Info</Label>
            <div className="space-y-1">
              {scene.scene_type && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Type:</span>
                  <span className="text-gray-200">{scene.scene_type}</span>
                </div>
              )}
              {scene.effective_image_model && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Effective Model:</span>
                  <span className="text-gray-200 font-mono text-xs">{scene.effective_image_model}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Character Visual Description (truncated) */}
        {metadata.character_visual_description && (
          <div>
            <Label className="text-xs text-gray-400 mb-1">Character Visual Description</Label>
            <p className="text-gray-300 text-xs bg-gray-800/50 p-2 rounded font-mono line-clamp-3">
              {metadata.character_visual_description.length > 150
                ? `${metadata.character_visual_description.substring(0, 150)}...`
                : metadata.character_visual_description}
            </p>
          </div>
        )}

        {/* Full Metadata JSON (collapsible) */}
        <details className="mt-2">
          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
            View Full Metadata JSON
          </summary>
          <pre className="mt-2 p-2 bg-gray-950 rounded text-xs text-gray-400 overflow-x-auto max-h-96 overflow-y-auto">
            {(() => {
              try {
                // Safely stringify with circular reference handling
                const safeMetadata = generationMetadata ? {
                  ...generationMetadata,
                  // Parse scene_context if it's a string
                  scene_context: generationMetadata.scene_context 
                    ? (typeof generationMetadata.scene_context === 'string' 
                      ? (() => {
                          try {
                            return JSON.parse(generationMetadata.scene_context);
                          } catch {
                            return generationMetadata.scene_context;
                          }
                        })()
                      : generationMetadata.scene_context)
                    : undefined
                } : undefined;

                const safeSceneData = sceneData ? {
                  ...sceneData,
                  // Remove any circular references or functions
                  generation_metadata: sceneData.generation_metadata ? {
                    ...sceneData.generation_metadata,
                    scene_context: sceneData.generation_metadata.scene_context
                      ? (typeof sceneData.generation_metadata.scene_context === 'string'
                        ? (() => {
                            try {
                              return JSON.parse(sceneData.generation_metadata.scene_context);
                            } catch {
                              return sceneData.generation_metadata.scene_context;
                            }
                          })()
                        : sceneData.generation_metadata.scene_context)
                      : undefined
                  } : undefined
                } : undefined;

                return JSON.stringify(
                  { generationMetadata: safeMetadata, sceneData: safeSceneData },
                  (key, value) => {
                    // Filter out functions and circular references
                    if (typeof value === 'function') {
                      return '[Function]';
                    }
                    if (value === undefined) {
                      return null;
                    }
                    return value;
                  },
                  2
                );
              } catch (error) {
                return `Error serializing metadata: ${error instanceof Error ? error.message : 'Unknown error'}`;
              }
            })()}
          </pre>
        </details>
      </div>
    </Card>
  );
};

