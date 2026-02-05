 import React from 'react';
 import { Settings } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Label } from '@/components/ui/label';
 import { usePlaygroundSettings, PlaygroundSettings } from '@/hooks/usePlaygroundSettings';
 import { useGroupedModels, usePlaygroundTemplates } from '@/hooks/usePlaygroundModels';
 import { Skeleton } from '@/components/ui/skeleton';
 
 interface PlaygroundSettingsPopoverProps {
   settings: PlaygroundSettings;
   onSettingsChange: (updates: Partial<PlaygroundSettings>) => void;
 }
 
 export const PlaygroundSettingsPopover: React.FC<PlaygroundSettingsPopoverProps> = ({
   settings,
   onSettingsChange,
 }) => {
   const { grouped, isLoading: modelsLoading } = useGroupedModels();
   const { data: templates, isLoading: templatesLoading } = usePlaygroundTemplates();
 
   const isLoading = modelsLoading || templatesLoading;
 
   return (
     <Popover>
       <PopoverTrigger asChild>
         <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Settings">
           <Settings className="h-3 w-3" />
         </Button>
       </PopoverTrigger>
       <PopoverContent className="w-72 p-3" align="end">
         <div className="space-y-3">
           <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Model Settings</h4>
           
           {isLoading ? (
             <div className="space-y-2">
               {[1, 2, 3, 4].map(i => (
                 <Skeleton key={i} className="h-7 w-full" />
               ))}
             </div>
           ) : (
             <div className="space-y-2">
               {/* Chat Model */}
               <div className="flex items-center gap-2">
                 <Label className="text-xs w-12 shrink-0">Chat</Label>
                 <Select
                   value={settings.chatModel}
                   onValueChange={(v) => onSettingsChange({ chatModel: v })}
                 >
                   <SelectTrigger className="h-7 text-xs flex-1">
                     <SelectValue placeholder="Select..." />
                   </SelectTrigger>
                   <SelectContent>
                     {grouped.chat.filter(m => m.model_key).map((m) => (
                       <SelectItem key={m.id} value={m.model_key} className="text-xs">
                         {m.display_name}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
 
               {/* Image Model */}
               <div className="flex items-center gap-2">
                 <Label className="text-xs w-12 shrink-0">Image</Label>
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
 
               {/* Video Model */}
               <div className="flex items-center gap-2">
                 <Label className="text-xs w-12 shrink-0">Video</Label>
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
 
               {/* I2I Model */}
               <div className="flex items-center gap-2">
                 <Label className="text-xs w-12 shrink-0">I2I</Label>
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
 
               <div className="border-t border-border pt-2 mt-2">
                 {/* Template */}
                 <div className="flex items-center gap-2">
                   <Label className="text-xs w-12 shrink-0">Template</Label>
                   <Select
                     value={settings.promptTemplateId || 'none'}
                     onValueChange={(v) => onSettingsChange({ promptTemplateId: v === 'none' ? '' : v })}
                   >
                     <SelectTrigger className="h-7 text-xs flex-1">
                       <SelectValue placeholder="Auto" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="none" className="text-xs">Auto-select</SelectItem>
                       {templates?.filter(t => t.id).map((t) => (
                         <SelectItem key={t.id} value={t.id} className="text-xs">
                           {t.template_name}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
 
                 {/* Content Mode */}
                 <div className="flex items-center gap-2 mt-2">
                   <Label className="text-xs w-12 shrink-0">Content</Label>
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
             </div>
           )}
         </div>
       </PopoverContent>
     </Popover>
   );
 };