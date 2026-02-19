import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
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
import { I2IModelOption } from '@/hooks/useI2IModels';

interface QuickSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAdvancedSettingsClick: () => void;
  // Settings values
  modelProvider: string;
  onModelProviderChange: (value: string) => void;
  selectedI2IModel: string;
  onSelectedI2IModelChange: (value: string) => void;
  sceneStyle: SceneStyle;
  onSceneStyleChange: (value: SceneStyle) => void;
  // Model options
  chatModels: Array<{ value: string; label: string; isAvailable: boolean; isLocal: boolean }>;
  i2iModels: I2IModelOption[];
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
  selectedI2IModel,
  onSelectedI2IModelChange,
  sceneStyle,
  onSceneStyleChange,
  chatModels,
  i2iModels,
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
        <SheetHeader className="pb-3">
          <SheetTitle className="text-left text-sm">Quick Settings</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Chat Model */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Chat Model</span>
            <Select value={modelProvider} onValueChange={onModelProviderChange}>
              <SelectTrigger className="h-9 text-sm">
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

          {/* I2I Model */}
          <div className="space-y-1.5">
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">I2I Model</span>
              <p className="text-[10px] text-muted-foreground">Image-to-Image</p>
            </div>
            <Select value={selectedI2IModel} onValueChange={onSelectedI2IModelChange}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select model..." />
              </SelectTrigger>
              <SelectContent>
                {i2iModels.filter(model => model.value).map((model) => (
                  <SelectItem
                    key={model.value}
                    value={model.value}
                    disabled={!model.isAvailable}
                  >
                    <div className="flex items-center gap-2">
                      <span>{model.label}</span>
                      {model.value === 'auto' && (
                        <Badge variant="outline" className="text-xs text-muted-foreground ml-auto">
                          Auto
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Scene Style */}
          <div className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" />
              Scene Style
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onSceneStyleChange('character_only')}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors min-h-[56px]",
                  sceneStyle === 'character_only'
                    ? "bg-blue-600/20 border-blue-500"
                    : "bg-card border-border hover:bg-accent"
                )}
              >
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-center">Character</span>
              </button>

              <button
                onClick={() => onSceneStyleChange('pov')}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors min-h-[56px]",
                  sceneStyle === 'pov'
                    ? "bg-blue-600/20 border-blue-500"
                    : "bg-card border-border hover:bg-accent"
                )}
              >
                <Eye className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-center">POV</span>
              </button>

              <button
                onClick={() => onSceneStyleChange('both_characters')}
                disabled={!hasUserCharacter}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors min-h-[56px]",
                  !hasUserCharacter
                    ? "opacity-50 cursor-not-allowed bg-card border-border"
                    : sceneStyle === 'both_characters'
                      ? "bg-blue-600/20 border-blue-500"
                      : "bg-card border-border hover:bg-accent"
                )}
              >
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-center">Both</span>
              </button>
            </div>
            {!hasUserCharacter && (
              <p className="text-[10px] text-muted-foreground">
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
            className="w-full h-9 justify-between text-sm"
          >
            <span className="flex items-center gap-2">
              <Settings2 className="w-3.5 h-3.5" />
              Advanced Settings
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
