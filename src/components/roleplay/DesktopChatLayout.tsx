import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Sparkles,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Character, CharacterScene } from '@/types/roleplay';

interface DesktopChatLayoutProps {
  character: Character | null;
  characterImage?: string | null;
  selectedScene?: CharacterScene | null;
  scenes?: CharacterScene[];
  onSceneSelect?: (scene: CharacterScene) => void;
  onSettingsClick?: () => void;
  onGenerateScene?: () => void;
  isGenerating?: boolean;
  children: React.ReactNode; // Chat messages and input
}

export const DesktopChatLayout: React.FC<DesktopChatLayoutProps> = ({
  character,
  characterImage,
  selectedScene,
  scenes = [],
  onSceneSelect,
  onSettingsClick,
  onGenerateScene,
  isGenerating = false,
  children
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (!character) {
    return <div className="flex-1">{children}</div>;
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left Sidebar - Character Info */}
      <aside
        className={cn(
          "flex-shrink-0 border-r border-border bg-card/50 transition-all duration-300",
          sidebarCollapsed ? "w-0 overflow-hidden" : "w-72 xl:w-80"
        )}
      >
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {/* Character Header */}
            <div className="text-center">
              <Avatar className="w-24 h-24 mx-auto mb-3">
                <AvatarImage src={characterImage || undefined} alt={character.name} />
                <AvatarFallback className="text-2xl bg-primary/20">
                  <User className="w-10 h-10" />
                </AvatarFallback>
              </Avatar>
              <h2 className="text-lg font-semibold text-foreground">{character.name}</h2>
              {character.role && (
                <p className="text-sm text-muted-foreground mt-1">{character.role}</p>
              )}
            </div>

            {/* Character Stats */}
            <div className="flex justify-center gap-4 py-2">
              <div className="text-center">
                <div className="text-lg font-semibold text-foreground">
                  {character.interaction_count || 0}
                </div>
                <div className="text-xs text-muted-foreground">Chats</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-foreground">
                  {character.likes_count || 0}
                </div>
                <div className="text-xs text-muted-foreground">Likes</div>
              </div>
            </div>

            {/* Description */}
            {character.description && (
              <Card className="p-3 bg-background/50">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {character.description}
                </p>
              </Card>
            )}

            {/* Appearance Tags */}
            {character.appearance_tags && character.appearance_tags.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  Appearance
                </h3>
                <div className="flex flex-wrap gap-1">
                  {character.appearance_tags.slice(0, 6).map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {character.appearance_tags.length > 6 && (
                    <Badge variant="outline" className="text-xs">
                      +{character.appearance_tags.length - 6}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Scenes */}
            {scenes.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  Scenes
                </h3>
                <div className="space-y-2">
                  {scenes.slice(0, 5).map((scene) => (
                    <button
                      key={scene.id}
                      onClick={() => onSceneSelect?.(scene)}
                      className={cn(
                        "w-full text-left p-2 rounded-lg border transition-colors",
                        selectedScene?.id === scene.id
                          ? "bg-primary/10 border-primary"
                          : "bg-background/50 border-border hover:bg-accent"
                      )}
                    >
                      <div className="text-sm font-medium text-foreground truncate">
                        {scene.scene_prompt.substring(0, 40)}...
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="space-y-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onGenerateScene}
                disabled={isGenerating}
                className="w-full"
              >
                <Sparkles className={cn("w-4 h-4 mr-2", isGenerating && "animate-pulse")} />
                {isGenerating ? 'Generating...' : 'Generate Scene'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onSettingsClick}
                className="w-full"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </ScrollArea>
      </aside>

      {/* Sidebar Toggle */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 z-10",
          "w-6 h-12 flex items-center justify-center",
          "bg-background border border-border rounded-r-md",
          "hover:bg-accent transition-colors",
          sidebarCollapsed ? "left-0" : "left-72 xl:left-80"
        )}
        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {children}
      </main>
    </div>
  );
};
