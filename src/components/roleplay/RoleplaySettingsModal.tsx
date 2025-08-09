import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Volume2, 
  Sparkles, 
  Shield, 
  MessageSquare,
  Image as ImageIcon,
  Clock
} from 'lucide-react';

interface RoleplaySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: RoleplaySettings;
  onSettingsChange: (settings: RoleplaySettings) => void;
}

export interface RoleplaySettings {
  contentMode: 'sfw' | 'nsfw';
  responseStyle: 'casual' | 'detailed' | 'immersive';
  responseLength: 'short' | 'medium' | 'long';
  autoSceneGeneration: boolean;
  voiceModel: 'none' | 'standard' | 'premium';
  enhancementModel: 'qwen_base' | 'qwen_instruct';
  sceneQuality: 'fast' | 'high';
  messageFrequency: number; // 1-10 scale for auto-scene generation frequency
}

export const RoleplaySettingsModal: React.FC<RoleplaySettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange
}) => {
  const [localSettings, setLocalSettings] = useState<RoleplaySettings>(settings);

  const updateSetting = <K extends keyof RoleplaySettings>(
    key: K,
    value: RoleplaySettings[K]
  ) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSettingsChange(localSettings);
    onClose();
  };

  const handleReset = () => {
    const defaultSettings: RoleplaySettings = {
      contentMode: 'sfw',
      responseStyle: 'detailed',
      responseLength: 'medium',
      autoSceneGeneration: false,
      voiceModel: 'none',
      enhancementModel: 'qwen_instruct',
      sceneQuality: 'fast',
      messageFrequency: 5
    };
    setLocalSettings(defaultSettings);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Roleplay Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="behavior" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="behavior" className="text-xs">
              <MessageSquare className="w-3 h-3 mr-1" />
              Behavior
            </TabsTrigger>
            <TabsTrigger value="content" className="text-xs">
              <Shield className="w-3 h-3 mr-1" />
              Content
            </TabsTrigger>
            <TabsTrigger value="scenes" className="text-xs">
              <ImageIcon className="w-3 h-3 mr-1" />
              Scenes
            </TabsTrigger>
            <TabsTrigger value="models" className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              Models
            </TabsTrigger>
          </TabsList>

          <TabsContent value="behavior" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Response Behavior</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Response Style</Label>
                  <Select 
                    value={localSettings.responseStyle} 
                    onValueChange={(value: 'casual' | 'detailed' | 'immersive') => updateSetting('responseStyle', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="casual">Casual - Quick, friendly responses</SelectItem>
                      <SelectItem value="detailed">Detailed - Rich, descriptive responses</SelectItem>
                      <SelectItem value="immersive">Immersive - Deep roleplay experiences</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Response Length</Label>
                  <Select 
                    value={localSettings.responseLength} 
                    onValueChange={(value: 'short' | 'medium' | 'long') => updateSetting('responseLength', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short - 1-2 sentences</SelectItem>
                      <SelectItem value="medium">Medium - 2-4 sentences</SelectItem>
                      <SelectItem value="long">Long - Detailed paragraphs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Voice Model</Label>
                  <Select 
                    value={localSettings.voiceModel} 
                    onValueChange={(value: 'none' | 'standard' | 'premium') => updateSetting('voiceModel', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Voice</SelectItem>
                      <SelectItem value="standard">Standard Voice</SelectItem>
                      <SelectItem value="premium">Premium Voice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Content Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Content Mode</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={localSettings.contentMode === 'sfw' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateSetting('contentMode', 'sfw')}
                      className="flex-1"
                    >
                      <Shield className="w-3 h-3 mr-1" />
                      SFW
                    </Button>
                    <Button
                      variant={localSettings.contentMode === 'nsfw' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateSetting('contentMode', 'nsfw')}
                      className="flex-1"
                    >
                      NSFW
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {localSettings.contentMode === 'sfw' 
                      ? 'Safe for work content only' 
                      : 'Allows mature content (18+)'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scenes" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Scene Generation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Auto Scene Generation</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically generate scene images during conversation
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.autoSceneGeneration}
                    onCheckedChange={(checked) => updateSetting('autoSceneGeneration', checked)}
                  />
                </div>

                {localSettings.autoSceneGeneration && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm">Generation Frequency</Label>
                      <div className="px-3">
                        <Slider
                          value={[localSettings.messageFrequency]}
                          onValueChange={([value]) => updateSetting('messageFrequency', value)}
                          max={10}
                          min={1}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Less frequent</span>
                          <span>Every {localSettings.messageFrequency} messages</span>
                          <span>More frequent</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Scene Quality</Label>
                      <Select 
                        value={localSettings.sceneQuality} 
                        onValueChange={(value: 'fast' | 'high') => updateSetting('sceneQuality', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fast">Fast - Quick generation</SelectItem>
                          <SelectItem value="high">High - Better quality</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="models" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">AI Models</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Enhancement Model</Label>
                  <Select 
                    value={localSettings.enhancementModel} 
                    onValueChange={(value: 'qwen_base' | 'qwen_instruct') => updateSetting('enhancementModel', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="qwen_instruct">Qwen Instruct - Better conversation</SelectItem>
                      <SelectItem value="qwen_base">Qwen Base - Faster responses</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Model used for enhancing prompts and responses
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleReset}>
            Reset to Default
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};