import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  Users,
  Camera,
  Settings2,
  WifiOff,
  Cloud,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SceneStyle } from '@/types/roleplay';

interface QuickSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAdvancedSettingsClick: () => void;
  // Settings values
  modelProvider: string;
  onModelProviderChange: (value: string) => void;
  selectedImageModel: string;
  onSelectedImageModelChange: (value: string) => void;
  sceneStyle: SceneStyle;
  onSceneStyleChange: (value: SceneStyle) => void;
  // Model options
  chatModels: Array<{ value: string; label: string; isAvailable: boolean; isLocal: boolean }>;
  imageModels: Array<{ value: string; label: string; isAvailable: boolean; type: string }>;
  chatWorkerHealthy: boolean;
  sdxlWorkerHealthy: boolean;
  // User character for scene style
  hasUserCharacter: boolean;
}

export const QuickSettingsDrawer: React.FC<QuickSettingsDrawerProps> = ({
  isOpen,
  onClose,
  onAdvancedSettingsClick,
  modelProvider,
  onModelProviderChange,
  selectedImageModel,
  onSelectedImageModelChange,
  sceneStyle,
  onSceneStyleChange,
  chatModels,
  imageModels,
  chatWorkerHealthy,
  sdxlWorkerHealthy,
  hasUserCharacter
}) => {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[80vh] overflow-y-auto"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      >
        <SheetHeader className="pb-4">
          <SheetTitle className="text-left">Quick Settings</SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Chat Model */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Chat Model</Label>
            {!chatWorkerHealthy && (
              <div className="flex items-center gap-2 text-xs text-amber-400 mb-1">
                <WifiOff className="w-3 h-3" />
                <span>Local models offline</span>
              </div>
            )}
            <Select value={modelProvider} onValueChange={onModelProviderChange}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Select model..." />
              </SelectTrigger>
              <SelectContent>
                {chatModels.filter(model => model.value).map((model) => (
                  <SelectItem
                    key={model.value}
                    value={model.value}
                    disabled={!model.isAvailable}
                  >
                    <div className="flex items-center gap-2">
                      <span className={!model.isAvailable ? 'opacity-50' : ''}>
                        {model.label}
                      </span>
                      {model.isLocal ? (
                        model.isAvailable ? (
                          <Badge variant="outline" className="text-xs text-green-400 border-green-400 ml-auto">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Local
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs ml-auto">
                            <WifiOff className="w-3 h-3 mr-1" />
                            Offline
                          </Badge>
                        )
                      ) : (
                        <Badge variant="outline" className="text-xs text-blue-400 border-blue-400 ml-auto">
                          <Cloud className="w-3 h-3 mr-1" />
                          API
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Image Model */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Image Model</Label>
            {!sdxlWorkerHealthy && (
              <div className="flex items-center gap-2 text-xs text-amber-400 mb-1">
                <WifiOff className="w-3 h-3" />
                <span>Local SDXL offline</span>
              </div>
            )}
            <Select value={selectedImageModel} onValueChange={onSelectedImageModelChange}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Select model..." />
              </SelectTrigger>
              <SelectContent>
                {imageModels.filter(model => model.value).map((model) => (
                  <SelectItem
                    key={model.value}
                    value={model.value}
                    disabled={!model.isAvailable}
                  >
                    <div className="flex items-center gap-2">
                      <span className={!model.isAvailable ? 'opacity-50' : ''}>
                        {model.label}
                      </span>
                      {model.type === 'local' ? (
                        model.isAvailable ? (
                          <Badge variant="outline" className="text-xs text-green-400 border-green-400 ml-auto">
                            Local
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs ml-auto">
                            Offline
                          </Badge>
                        )
                      ) : (
                        <Badge variant="outline" className="text-xs text-blue-400 border-blue-400 ml-auto">
                          API
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Scene Style */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Scene Style
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onSceneStyleChange('character_only')}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors min-h-[72px]",
                  sceneStyle === 'character_only'
                    ? "bg-blue-600/20 border-blue-500"
                    : "bg-card border-border hover:bg-accent"
                )}
              >
                <Eye className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs text-center">Character</span>
              </button>

              <button
                onClick={() => onSceneStyleChange('pov')}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors min-h-[72px]",
                  sceneStyle === 'pov'
                    ? "bg-blue-600/20 border-blue-500"
                    : "bg-card border-border hover:bg-accent"
                )}
              >
                <Eye className="w-5 h-5 text-purple-400" />
                <span className="text-xs text-center">POV</span>
              </button>

              <button
                onClick={() => onSceneStyleChange('both_characters')}
                disabled={!hasUserCharacter}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors min-h-[72px]",
                  !hasUserCharacter
                    ? "opacity-50 cursor-not-allowed bg-card border-border"
                    : sceneStyle === 'both_characters'
                      ? "bg-blue-600/20 border-blue-500"
                      : "bg-card border-border hover:bg-accent"
                )}
              >
                <Users className="w-5 h-5 text-blue-400" />
                <span className="text-xs text-center">Both</span>
              </button>
            </div>
            {!hasUserCharacter && (
              <p className="text-xs text-muted-foreground">
                Select a character with a reference image in Advanced Settings to enable "Both" mode
              </p>
            )}
          </div>

          {/* Advanced Settings Link */}
          <Button
            variant="outline"
            onClick={() => {
              onClose();
              onAdvancedSettingsClick();
            }}
            className="w-full h-12 justify-between"
          >
            <span className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Advanced Settings
            </span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
