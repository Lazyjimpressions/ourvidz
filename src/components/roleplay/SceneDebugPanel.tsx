import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Code, Database, Settings, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SceneDebugPanelProps {
  generationMetadata?: {
    // ✅ ADMIN: Prompt template info (REQUIRED)
    template_id?: string; // From prompt_templates.id
    template_name?: string; // From prompt_templates.template_name
    scene_template_id?: string; // Scene prompt template ID
    scene_template_name?: string; // Scene prompt template name
    // Existing fields
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
    // ✅ ADMIN: Chat response info
    chat_model_used?: string;
    chat_provider?: string;
    processing_time?: number;
    memory_tier?: string;
    content_tier?: string;
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
    <Card className={cn("p-3 bg-gray-900/80 border-gray-700", className)}>
      <div className="flex items-center gap-2 mb-2">
        <Code className="w-3.5 h-3.5 text-purple-400" />
        <Label className="text-xs font-medium text-purple-300">Admin Debug</Label>
      </div>

      <div className="space-y-2 text-xs">
        {/* ✅ ADMIN: Prompt Template Info (ID + Name) */}
        {(metadata.template_id || metadata.template_name || metadata.scene_template_id || metadata.scene_template_name) && (
          <div>
            <Label className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Prompt Template
            </Label>
            <div className="space-y-0.5">
              {metadata.template_id && (
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 text-[10px]">ID:</span>
                  <code className="text-[10px] text-purple-300 font-mono">{metadata.template_id.substring(0, 8)}...</code>
                  {metadata.template_id && (
                    <a
                      href={`/admin?tab=prompt-management&template=${metadata.template_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-400 hover:text-blue-300 ml-1"
                      onClick={(e) => e.stopPropagation()}
                      title="Open template in admin panel"
                    >
                      view
                    </a>
                  )}
                </div>
              )}
              {metadata.template_name && (
                <p className="text-gray-200 text-xs font-mono">{metadata.template_name}</p>
              )}
              {metadata.scene_template_id && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-gray-500 text-[10px]">Scene Template ID:</span>
                  <code className="text-[10px] text-purple-300 font-mono">{metadata.scene_template_id.substring(0, 8)}...</code>
                  <a
                    href={`/admin?tab=prompt-management&template=${metadata.scene_template_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-400 hover:text-blue-300 ml-1"
                    onClick={(e) => e.stopPropagation()}
                    title="Open scene template in admin panel"
                  >
                    view
                  </a>
                </div>
              )}
              {metadata.scene_template_name && (
                <p className="text-gray-200 text-xs font-mono">{metadata.scene_template_name}</p>
              )}
            </div>
          </div>
        )}

        {/* Template & Model Info */}
        <div className="grid grid-cols-2 gap-2">
          
          {metadata.model_display_name && (
            <div>
              <Label className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                <Database className="w-3 h-3" />
                Image Model
              </Label>
              <p className="text-gray-200 font-mono text-xs">{metadata.model_display_name}</p>
              {metadata.model_used && metadata.model_used !== metadata.model_display_name && (
                <p className="text-gray-400 text-[10px] mt-0.5">({metadata.model_used})</p>
              )}
            </div>
          )}
        </div>

        {/* ✅ ADMIN: Chat Response Info */}
        {(metadata.chat_model_used || metadata.chat_provider || metadata.processing_time) && (
          <div>
            <Label className="text-xs text-gray-400 mb-1">Chat Response</Label>
            <div className="space-y-0.5">
              {metadata.chat_model_used && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-500">Model:</span>
                  <span className="text-gray-200 font-mono">{metadata.chat_model_used}</span>
                </div>
              )}
              {metadata.chat_provider && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-500">Provider:</span>
                  <span className="text-gray-200">{metadata.chat_provider}</span>
                </div>
              )}
              {metadata.processing_time && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-500">Time:</span>
                  <span className="text-gray-200">{metadata.processing_time}ms</span>
                </div>
              )}
              {metadata.memory_tier && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-500">Memory:</span>
                  <span className="text-gray-200">{metadata.memory_tier}</span>
                </div>
              )}
              {metadata.content_tier && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-500">Content:</span>
                  <span className="text-gray-200">{metadata.content_tier.toUpperCase()}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Provider & Consistency */}
        <div className="grid grid-cols-2 gap-2">
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
            <Label className="text-xs text-gray-400 mb-1">Character Visual</Label>
            <p className="text-gray-300 text-[10px] bg-gray-800/50 p-1.5 rounded font-mono line-clamp-2">
              {metadata.character_visual_description.length > 100
                ? `${metadata.character_visual_description.substring(0, 100)}...`
                : metadata.character_visual_description}
            </p>
          </div>
        )}

        {/* Full Metadata JSON (collapsible) */}
        <details className="mt-1.5">
          <summary className="text-[10px] text-gray-400 cursor-pointer hover:text-gray-300">
            View Full JSON
          </summary>
          <pre className="mt-1.5 p-1.5 bg-gray-950 rounded text-[10px] text-gray-400 overflow-x-auto max-h-64 overflow-y-auto">
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

