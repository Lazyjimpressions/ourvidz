import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  MoreVertical,
  Image as ImageIcon,
  Loader2,
  Edit,
  Play
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CharacterScene } from '@/hooks/useCharacterStudio';

interface ScenesGalleryProps {
  scenes: CharacterScene[];
  selectedSceneId: string | null;
  isNewCharacter: boolean;
  onSelect: (id: string) => void;
  onEdit: (scene: CharacterScene) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
  onStartChat: (scene: CharacterScene) => void;
}

export function ScenesGallery({
  scenes,
  selectedSceneId,
  isNewCharacter,
  onSelect,
  onEdit,
  onDelete,
  onAddNew,
  onStartChat
}: ScenesGalleryProps) {
  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">Character Scenes</h3>
          <Badge variant="secondary" className="text-xs">
            {scenes.length}
          </Badge>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onAddNew}
          disabled={isNewCharacter}
          className="gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Scene
        </Button>
      </div>

      {/* Gallery Grid */}
      {scenes.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {scenes.map((scene) => {
            const isSelected = scene.id === selectedSceneId;

            return (
              <div
                key={scene.id}
                className={cn(
                  'group relative aspect-video rounded-lg overflow-hidden cursor-pointer',
                  'border-2 transition-all duration-200',
                  isSelected 
                    ? 'border-primary ring-2 ring-primary/20' 
                    : 'border-border hover:border-primary/50'
                )}
                onClick={() => onSelect(scene.id)}
              >
                {/* Image or Placeholder */}
                {scene.image_url ? (
                  <img
                    src={scene.image_url}
                    alt={scene.scene_name || 'Scene'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}

                {/* Scene Name Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-xs font-medium text-white truncate">
                    {scene.scene_name || 'Unnamed Scene'}
                  </p>
                </div>

                {/* Hover Overlay */}
                <div className={cn(
                  'absolute inset-0 bg-black/60',
                  'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                  'flex items-center justify-center gap-2'
                )}>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 text-xs gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartChat(scene);
                    }}
                  >
                    <Play className="w-3 h-3" />
                    Start Chat
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => onEdit(scene)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Scene
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => onDelete(scene.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}

          {/* Add New Tile */}
          <button
            onClick={onAddNew}
            disabled={isNewCharacter}
            className={cn(
              'aspect-video rounded-lg border-2 border-dashed border-border',
              'flex flex-col items-center justify-center gap-2',
              'text-muted-foreground hover:text-foreground hover:border-primary/50',
              'transition-colors duration-200',
              isNewCharacter && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Plus className="w-5 h-5" />
            <span className="text-xs">Add Scene</span>
          </button>
        </div>
      ) : (
        /* Empty State */
        <div className={cn(
          'border-2 border-dashed border-border rounded-lg',
          'flex flex-col items-center justify-center gap-3 py-8 px-4',
          'text-center'
        )}>
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-foreground">No scenes yet</h4>
            <p className="text-xs text-muted-foreground mt-1">
              {isNewCharacter 
                ? 'Save your character first to add scenes'
                : 'Create preset scenes for roleplay conversations'
              }
            </p>
          </div>
          <Button 
            onClick={onAddNew} 
            disabled={isNewCharacter}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Create First Scene
          </Button>
        </div>
      )}
    </div>
  );
}
