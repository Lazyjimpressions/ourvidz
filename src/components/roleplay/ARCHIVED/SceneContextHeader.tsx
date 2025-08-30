import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Image as ImageIcon, 
  Play, 
  Pause, 
  RotateCcw,
  Settings,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Scene {
  id: string;
  scene_prompt: string;
  image_url?: string;
  generation_metadata?: any;
}

interface SceneContextHeaderProps {
  scene?: Scene | null;
  characterName?: string;
  isActive?: boolean;
  isGenerating?: boolean;
  onStartScene?: () => void;
  onPauseScene?: () => void;
  onResetScene?: () => void;
  onToggleSceneVisibility?: () => void;
  onOpenSettings?: () => void;
  className?: string;
}

export const SceneContextHeader: React.FC<SceneContextHeaderProps> = ({
  scene,
  characterName,
  isActive = false,
  isGenerating = false,
  onStartScene,
  onPauseScene,
  onResetScene,
  onToggleSceneVisibility,
  onOpenSettings,
  className
}) => {
  const [showSceneImage, setShowSceneImage] = useState(true);

  if (!scene) {
    return (
      <div className={cn("bg-muted/30 border-b border-border/40 p-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-medium text-sm">No Scene Active</h3>
              <p className="text-xs text-muted-foreground">
                Start a scene to begin roleplay
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenSettings}
              disabled={isGenerating}
            >
              <Settings className="w-3 h-3 mr-1" />
              Settings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-gradient-to-r from-primary/5 to-primary/10 border-b border-primary/20 p-4", className)}>
      <div className="flex items-start gap-4">
        {/* Scene Image */}
        {scene.image_url && showSceneImage && (
          <div className="relative flex-shrink-0">
            <img
              src={scene.image_url}
              alt={scene.scene_prompt}
              className="w-16 h-16 object-cover rounded-lg border border-border/40"
            />
            <button
              onClick={() => setShowSceneImage(false)}
              className="absolute -top-1 -right-1 w-5 h-5 bg-background border border-border rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            >
              <EyeOff className="w-3 h-3" />
            </button>
          </div>
        )}
        
        {(!scene.image_url || !showSceneImage) && (
          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
            <ImageIcon className="w-6 h-6 text-muted-foreground" />
          </div>
        )}

        {/* Scene Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              Active Scene
            </Badge>
            {isGenerating && (
              <Badge variant="outline" className="text-xs animate-pulse">
                Generating...
              </Badge>
            )}
            {isActive && !isGenerating && (
              <Badge variant="default" className="text-xs">
                Live
              </Badge>
            )}
          </div>
          
          <h3 className="font-medium text-sm mb-1 line-clamp-2">
            {scene.scene_prompt}
          </h3>
          
          {characterName && (
            <p className="text-xs text-muted-foreground">
              Roleplaying with <span className="font-medium">{characterName}</span>
            </p>
          )}
        </div>

        {/* Scene Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {!showSceneImage && scene.image_url && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSceneImage(true)}
              title="Show Scene Image"
            >
              <Eye className="w-3 h-3" />
            </Button>
          )}
          
          {onStartScene && !isActive && (
            <Button
              size="sm"
              onClick={onStartScene}
              disabled={isGenerating}
              className="bg-primary hover:bg-primary/90"
            >
              <Play className="w-3 h-3 mr-1" />
              Start Scene
            </Button>
          )}
          
          {onPauseScene && isActive && (
            <Button
              size="sm"
              variant="outline"
              onClick={onPauseScene}
              disabled={isGenerating}
            >
              <Pause className="w-3 h-3 mr-1" />
              Pause
            </Button>
          )}
          
          {onResetScene && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onResetScene}
              disabled={isGenerating}
              title="Reset Scene"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
          )}
          
          {onToggleSceneVisibility && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onToggleSceneVisibility}
              disabled={isGenerating}
              title="Toggle Scene Visibility"
            >
              <Eye className="w-3 h-3" />
            </Button>
          )}
          
          {onOpenSettings && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenSettings}
              disabled={isGenerating}
            >
              <Settings className="w-3 h-3 mr-1" />
              Settings
            </Button>
          )}
        </div>
      </div>

      {/* Scene Progress (if generating) */}
      {isGenerating && (
        <div className="mt-3">
          <div className="w-full bg-muted rounded-full h-1">
            <div className="bg-primary h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Setting up scene environment and atmosphere...
          </p>
        </div>
      )}
    </div>
  );
};