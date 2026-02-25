import React from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PlaygroundSettings } from '@/hooks/usePlaygroundSettings';
import { useGroupedModels, usePlaygroundTemplates, PromptTemplate } from '@/hooks/usePlaygroundModels';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

interface PlaygroundSettingsPopoverProps {
  settings: PlaygroundSettings;
  onSettingsChange: (updates: Partial<PlaygroundSettings>) => void;
}

/** Reusable template dropdown filtered by use_case values */
const TemplateSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  templates: PromptTemplate[];
  useCases: string[];
}> = ({ value, onChange, templates, useCases }) => {
  const filtered = templates.filter(t => useCases.includes(t.use_case));
  if (filtered.length === 0) return null;

  return (
    <div className="flex items-center gap-2 pl-4">
      <Label className="text-xs w-14 shrink-0 text-muted-foreground">Template</Label>
      <Select
        value={value || 'auto'}
        onValueChange={(v) => onChange(v === 'auto' ? '' : v)}
      >
        <SelectTrigger className="h-7 text-xs flex-1">
          <SelectValue placeholder="Auto" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="auto" className="text-xs">Auto-select</SelectItem>
          {filtered.map((t) => (
            <SelectItem key={t.id} value={t.id} className="text-xs">
              {t.template_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export const PlaygroundSettingsPopover: React.FC<PlaygroundSettingsPopoverProps> = ({
  settings,
  onSettingsChange,
}) => {
  const { grouped, isLoading: modelsLoading } = useGroupedModels();
  const { data: templates = [], isLoading: templatesLoading } = usePlaygroundTemplates();

  const isLoading = modelsLoading || templatesLoading;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Settings">
          <Settings className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="end">
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Model & Template Settings</h4>
          
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-7 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {/* ─── Roleplay ─── */}
              <div className="flex items-center gap-2">
                <Label className="text-xs w-16 shrink-0">Roleplay</Label>
                <Select
                  value={settings.roleplayModel}
                  onValueChange={(v) => onSettingsChange({ roleplayModel: v })}
                >
                  <SelectTrigger className="h-7 text-xs flex-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {grouped.roleplay.filter(m => m.model_key).map((m) => (
                      <SelectItem key={m.id} value={m.model_key} className="text-xs">
                        {m.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <TemplateSelect
                value={settings.roleplayTemplateId}
                onChange={(v) => onSettingsChange({ roleplayTemplateId: v })}
                templates={templates}
                useCases={['roleplay', 'character_roleplay']}
              />

              {/* ─── Reasoning ─── */}
              {grouped.reasoning.length > 0 && (
                <>
                  <Separator className="my-1.5" />
                  <div className="flex items-center gap-2">
                    <Label className="text-xs w-16 shrink-0">Reasoning</Label>
                    <Select
                      value={settings.reasoningModel || 'auto'}
                      onValueChange={(v) => onSettingsChange({ reasoningModel: v === 'auto' ? '' : v })}
                    >
                      <SelectTrigger className="h-7 text-xs flex-1">
                        <SelectValue placeholder="Auto (default)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto" className="text-xs">Auto (default)</SelectItem>
                        {grouped.reasoning.filter(m => m.model_key).map((m) => (
                          <SelectItem key={m.id} value={m.model_key} className="text-xs">
                            {m.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <TemplateSelect
                    value={settings.reasoningTemplateId}
                    onChange={(v) => onSettingsChange({ reasoningTemplateId: v })}
                    templates={templates}
                    useCases={['chat_general', 'chat_admin', 'chat_creative']}
                  />
                </>
              )}

              {/* ─── Image ─── */}
              <Separator className="my-1.5" />
              <div className="flex items-center gap-2">
                <Label className="text-xs w-16 shrink-0">Image</Label>
                <Select
                  value={settings.imageModel}
                  onValueChange={(v) => onSettingsChange({ imageModel: v })}
                >
                  <SelectTrigger className="h-7 text-xs flex-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {grouped.image.filter(m => m.model_key).map((m) => (
                      <SelectItem key={m.id} value={m.model_key} className="text-xs">
                        {m.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <TemplateSelect
                value={settings.imageTemplateId}
                onChange={(v) => onSettingsChange({ imageTemplateId: v })}
                templates={templates}
                useCases={['enhancement']}
              />

              {/* ─── Video ─── */}
              <Separator className="my-1.5" />
              <div className="flex items-center gap-2">
                <Label className="text-xs w-16 shrink-0">Video</Label>
                <Select
                  value={settings.videoModel}
                  onValueChange={(v) => onSettingsChange({ videoModel: v })}
                >
                  <SelectTrigger className="h-7 text-xs flex-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {grouped.video.filter(m => m.model_key).map((m) => (
                      <SelectItem key={m.id} value={m.model_key} className="text-xs">
                        {m.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <TemplateSelect
                value={settings.videoTemplateId}
                onChange={(v) => onSettingsChange({ videoTemplateId: v })}
                templates={templates}
                useCases={['enhancement']}
              />

              {/* ─── I2I ─── */}
              <Separator className="my-1.5" />
              <div className="flex items-center gap-2">
                <Label className="text-xs w-16 shrink-0">I2I</Label>
                <Select
                  value={settings.i2iModel}
                  onValueChange={(v) => onSettingsChange({ i2iModel: v })}
                >
                  <SelectTrigger className="h-7 text-xs flex-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {grouped.i2i.filter(m => m.model_key).map((m) => (
                      <SelectItem key={m.id} value={m.model_key} className="text-xs">
                        {m.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ─── Enhancement ─── */}
              {grouped.enhancement.length > 0 && (
                <>
                  <Separator className="my-1.5" />
                  <div className="flex items-center gap-2">
                    <Label className="text-xs w-16 shrink-0">Enhance</Label>
                    <Select
                      value={settings.enhancementModel || 'auto'}
                      onValueChange={(v) => onSettingsChange({ enhancementModel: v === 'auto' ? '' : v })}
                    >
                      <SelectTrigger className="h-7 text-xs flex-1">
                        <SelectValue placeholder="Auto (default)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto" className="text-xs">Auto (default)</SelectItem>
                        {grouped.enhancement.filter(m => m.model_key).map((m) => (
                          <SelectItem key={m.id} value={m.model_key} className="text-xs">
                            {m.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <TemplateSelect
                    value={settings.enhancementTemplateId}
                    onChange={(v) => onSettingsChange({ enhancementTemplateId: v })}
                    templates={templates}
                    useCases={['enhancement']}
                  />
                </>
              )}

              {/* ─── Content Mode ─── */}
              <Separator className="my-1.5" />
              <div className="flex items-center gap-2">
                <Label className="text-xs w-16 shrink-0">Content</Label>
                <Select
                  value={settings.contentMode}
                  onValueChange={(v) => onSettingsChange({ contentMode: v as 'sfw' | 'nsfw' })}
                >
                  <SelectTrigger className="h-7 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nsfw" className="text-xs">NSFW</SelectItem>
                    <SelectItem value="sfw" className="text-xs">SFW</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
