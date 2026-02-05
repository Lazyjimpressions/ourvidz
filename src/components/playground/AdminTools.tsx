 import React, { useState } from 'react';
 import { Button } from '@/components/ui/button';
 import { Textarea } from '@/components/ui/textarea';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Card, CardContent } from '@/components/ui/card';
 import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
 import { ChevronDown, Settings, TestTube, Monitor, Wrench } from 'lucide-react';
 import { useGroupedModels, usePlaygroundTemplates } from '@/hooks/usePlaygroundModels';
 import { Skeleton } from '@/components/ui/skeleton';
 
 interface AdminTool {
   id: string;
   name: string;
   icon: React.ElementType;
   description: string;
 }
 
 const adminTools: AdminTool[] = [
   {
     id: 'prompt-builder',
     name: 'Prompt Builder',
     icon: Wrench,
     description: 'AI assistant for creating optimized prompts',
   },
   {
     id: 'prompt-tester',
     name: 'Prompt Tester',
     icon: TestTube,
     description: 'Test and analyze prompt effectiveness',
   },
   {
     id: 'system-monitor',
     name: 'System Monitor',
     icon: Monitor,
     description: 'Monitor system performance and health',
   },
   {
     id: 'model-config',
     name: 'Model Config',
     icon: Settings,
     description: 'Configure AI model parameters',
   },
 ];
 
 interface AdminToolsProps {
   onStartTool: (tool: AdminTool, context?: any) => void;
 }
 
 export const AdminTools: React.FC<AdminToolsProps> = ({ onStartTool }) => {
   const [isOpen, setIsOpen] = useState(false);
   const [selectedTool, setSelectedTool] = useState<string>('');
   const [targetModel, setTargetModel] = useState('');
   const [selectedTemplate, setSelectedTemplate] = useState('');
   const [purpose, setPurpose] = useState('');
 
   const { grouped, isLoading: modelsLoading } = useGroupedModels();
   const { data: templates, isLoading: templatesLoading } = usePlaygroundTemplates();
 
   // Get target model info for context
   const getModelInfo = (modelKey: string) => {
     const allModels = [
       ...grouped.chat.map(m => ({ ...m, category: 'Chat/Roleplay' })),
       ...grouped.image.map(m => ({ ...m, category: 'Image Generation' })),
       ...grouped.video.map(m => ({ ...m, category: 'Video Generation' })),
       ...grouped.i2i.map(m => ({ ...m, category: 'Image-to-Image' })),
     ];
     return allModels.find(m => m.model_key === modelKey);
   };
 
   const handleToolStart = () => {
     const tool = adminTools.find(t => t.id === selectedTool);
     if (!tool) return;
 
     const modelInfo = getModelInfo(targetModel);
     const templateInfo = templates?.find(t => t.id === selectedTemplate);
 
     const context = {
       toolId: tool.id,
       targetModel,
       targetModelName: modelInfo?.display_name || targetModel,
       targetModelCategory: modelInfo?.category,
       targetModelFamily: modelInfo?.model_family,
       selectedTemplate: selectedTemplate === '_auto' ? '' : selectedTemplate,
       selectedTemplateName: templateInfo?.template_name,
       purpose,
     };
 
     onStartTool(tool, context);
     setIsOpen(false);
     // Reset for next use
     setSelectedTool('');
     setTargetModel('');
     setSelectedTemplate('');
     setPurpose('');
   };
 
   const isLoading = modelsLoading || templatesLoading;
 
   return (
     <Collapsible open={isOpen} onOpenChange={setIsOpen}>
       <CollapsibleTrigger asChild>
         <Button variant="outline" size="sm" className="w-full justify-between h-7 text-xs">
           Admin Tools
           <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
         </Button>
       </CollapsibleTrigger>
       <CollapsibleContent>
         <Card className="mt-2 border-border bg-muted/30">
           <CardContent className="p-2 space-y-2">
             {/* Tool Selection - Compact Grid */}
             <div className="grid grid-cols-4 gap-1">
               {adminTools.map((tool) => {
                 const IconComponent = tool.icon;
                 const isSelected = selectedTool === tool.id;
                 return (
                   <Button
                     key={tool.id}
                     variant={isSelected ? 'default' : 'ghost'}
                     size="sm"
                     onClick={() => setSelectedTool(isSelected ? '' : tool.id)}
                     className="h-10 p-1 flex flex-col items-center justify-center gap-0.5"
                     title={tool.description}
                   >
                     <IconComponent className="h-3.5 w-3.5" />
                     <span className="text-[10px] leading-tight truncate w-full text-center">
                       {tool.name.split(' ')[0]}
                     </span>
                   </Button>
                 );
               })}
             </div>
 
             {/* Configuration - Only show when tool selected */}
             {selectedTool && (
               <div className="space-y-2 pt-1 border-t border-border">
                 {isLoading ? (
                   <div className="space-y-2">
                     <Skeleton className="h-7 w-full" />
                     <Skeleton className="h-7 w-full" />
                   </div>
                 ) : (
                   <>
                     {/* Target Model Selection */}
                     <div className="flex items-center gap-2">
                       <label className="text-xs text-muted-foreground w-14 shrink-0">Target</label>
                       <Select value={targetModel} onValueChange={setTargetModel}>
                         <SelectTrigger className="h-7 text-xs flex-1">
                           <SelectValue placeholder="Select target model..." />
                         </SelectTrigger>
                         <SelectContent>
                           {grouped.image.length > 0 && (
                             <>
                               <SelectItem value="_img_h" disabled className="text-[10px] font-medium text-muted-foreground py-1">
                                 — Image Models —
                               </SelectItem>
                               {grouped.image.filter(m => m.model_key).map(m => (
                                 <SelectItem key={m.id} value={m.model_key} className="text-xs">
                                   {m.display_name}
                                 </SelectItem>
                               ))}
                             </>
                           )}
                           {grouped.video.length > 0 && (
                             <>
                               <SelectItem value="_vid_h" disabled className="text-[10px] font-medium text-muted-foreground py-1">
                                 — Video Models —
                               </SelectItem>
                               {grouped.video.filter(m => m.model_key).map(m => (
                                 <SelectItem key={m.id} value={m.model_key} className="text-xs">
                                   {m.display_name}
                                 </SelectItem>
                               ))}
                             </>
                           )}
                           {grouped.chat.length > 0 && (
                             <>
                               <SelectItem value="_chat_h" disabled className="text-[10px] font-medium text-muted-foreground py-1">
                                 — Chat/RP Models —
                               </SelectItem>
                               {grouped.chat.filter(m => m.model_key).map(m => (
                                 <SelectItem key={m.id} value={m.model_key} className="text-xs">
                                   {m.display_name}
                                 </SelectItem>
                               ))}
                             </>
                           )}
                         </SelectContent>
                       </Select>
                     </div>
 
                     {/* Template Selection */}
                     <div className="flex items-center gap-2">
                       <label className="text-xs text-muted-foreground w-14 shrink-0">Template</label>
                       <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                         <SelectTrigger className="h-7 text-xs flex-1">
                           <SelectValue placeholder="Select template..." />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="_auto" className="text-xs">Auto-select</SelectItem>
                           {templates?.filter(t => t.id).map(t => (
                             <SelectItem key={t.id} value={t.id} className="text-xs">
                               {t.template_name}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>
 
                     {/* Purpose/Goal */}
                     <div>
                       <Textarea
                         value={purpose}
                         onChange={(e) => setPurpose(e.target.value)}
                         placeholder="Describe what you want to achieve..."
                         className="min-h-[40px] text-xs resize-none"
                         rows={2}
                       />
                     </div>
 
                     {/* Start Button */}
                     <Button
                       onClick={handleToolStart}
                       disabled={!selectedTool || !targetModel}
                       size="sm"
                       className="w-full h-7 text-xs"
                     >
                       Start {adminTools.find(t => t.id === selectedTool)?.name}
                     </Button>
                   </>
                 )}
               </div>
             )}
           </CardContent>
         </Card>
       </CollapsibleContent>
     </Collapsible>
   );
 };