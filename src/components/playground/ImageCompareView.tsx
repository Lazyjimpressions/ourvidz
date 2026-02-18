import React, { useState, useEffect, useRef } from 'react';
import { Send, RotateCcw, Loader2, ZoomIn, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAllVisualModels } from '@/hooks/useApiModels';
import { ReferenceImageSlots, type ReferenceImage } from './ReferenceImageSlots';

interface PromptTemplate {
  id: string;
  template_name: string;
  use_case: string;
  system_prompt: string;
}

interface Generation {
  id: string;
  prompt: string;
  mediaUrl: string;
  isVideo: boolean;
  modelName: string;
  time: number;
  seed: number | null;
}

interface PanelState {
  modelId: string; // '' or '__none__'
  templateId: string;
  referenceImages: ReferenceImage[];
  generations: Generation[];
  isLoading: boolean;
  elapsedMs: number;
}

const NONE_VALUE = '__none__';

const defaultPanel = (modelId: string): PanelState => ({
  modelId,
  templateId: '',
  referenceImages: [],
  generations: [],
  isLoading: false,
  elapsedMs: 0,
});

/** Determine if a model needs reference images */
const modelNeedsRef = (model: { modality: string; task: string; model_key: string }) => {
  if (model.task === 'style_transfer') return true;
  if (model.modality === 'video' &&
    (model.model_key.includes('i2v') || model.model_key.includes('image-to-video'))) return true;
  return false;
};

/** Determine max reference slots for a model */
const getMaxSlots = (model: { capabilities: Record<string, any> }) => {
  return model.capabilities?.requires_image_urls_array ? 4 : 1;
};

/** Check if a model produces video output */
const isVideoModel = (model: { modality: string }) => model.modality === 'video';

/** Check if a media URL is video */
const isVideoUrl = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url);

export const ImageCompareView: React.FC = () => {
  const { data: visualModels } = useAllVisualModels();
  const t2iModels = visualModels?.t2i ?? [];
  const i2iModels = visualModels?.i2i ?? [];
  const i2vModels = visualModels?.i2v ?? [];
  const allModels = visualModels?.all ?? [];

  const [panelA, setPanelA] = useState<PanelState>(() => defaultPanel(''));
  const [panelB, setPanelB] = useState<PanelState>(() => defaultPanel(''));
  const [prompt, setPrompt] = useState('');
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxIsVideo, setLightboxIsVideo] = useState(false);

  const scrollRefA = useRef<HTMLDivElement>(null);
  const scrollRefB = useRef<HTMLDivElement>(null);
  const timerRefA = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRefB = useRef<ReturnType<typeof setInterval> | null>(null);

  // Set default models once loaded
  useEffect(() => {
    if (t2iModels.length > 0) {
      setPanelA(prev => prev.modelId ? prev : { ...prev, modelId: t2iModels[0].id });
      setPanelB(prev => prev.modelId ? prev : { ...prev, modelId: t2iModels[1]?.id || t2iModels[0].id });
    }
  }, [t2iModels]);

  // Fetch prompt templates
  useEffect(() => {
    const fetchTemplates = async () => {
      const { data } = await supabase
        .from('prompt_templates')
        .select('id, template_name, use_case, system_prompt')
        .eq('is_active', true)
        .order('use_case')
        .order('template_name');
      if (data) setTemplates(data);
    };
    fetchTemplates();
  }, []);

  // Auto-scroll
  useEffect(() => {
    scrollRefA.current?.scrollTo({ top: scrollRefA.current.scrollHeight, behavior: 'smooth' });
  }, [panelA.generations, panelA.isLoading]);
  useEffect(() => {
    scrollRefB.current?.scrollTo({ top: scrollRefB.current.scrollHeight, behavior: 'smooth' });
  }, [panelB.generations, panelB.isLoading]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (timerRefA.current) clearInterval(timerRefA.current);
      if (timerRefB.current) clearInterval(timerRefB.current);
    };
  }, []);

  const startTimer = (
    setPanel: React.Dispatch<React.SetStateAction<PanelState>>,
    timerRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>
  ) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const startTime = Date.now();
    setPanel(prev => ({ ...prev, elapsedMs: 0 }));
    timerRef.current = setInterval(() => {
      setPanel(prev => ({ ...prev, elapsedMs: Date.now() - startTime }));
    }, 100);
  };

  const stopTimer = (timerRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const buildFinalPrompt = (userPrompt: string, templateId: string): string => {
    if (!templateId || templateId === NONE_VALUE) return userPrompt;
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return userPrompt;
    return `${tpl.system_prompt}\n\n${userPrompt}`;
  };

  const getModelById = (id: string) => allModels.find(m => m.id === id);

  const panelIsActive = (panel: PanelState) => panel.modelId && panel.modelId !== NONE_VALUE;

  const panelNeedsRef = (panel: PanelState) => {
    const model = getModelById(panel.modelId);
    return model ? modelNeedsRef(model) : false;
  };

  const panelRefSatisfied = (panel: PanelState) => {
    if (!panelNeedsRef(panel)) return true;
    return panel.referenceImages.length > 0;
  };

  const canSubmitPanel = (panel: PanelState) =>
    panelIsActive(panel) && !panel.isLoading && panelRefSatisfied(panel);

  const generateForPanel = async (
    panel: PanelState,
    setPanel: React.Dispatch<React.SetStateAction<PanelState>>,
    timerRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>,
    userPrompt: string
  ) => {
    if (!panelIsActive(panel) || !panelRefSatisfied(panel)) return;

    const model = getModelById(panel.modelId);
    if (!model) return;

    setPanel(prev => ({ ...prev, isLoading: true }));
    startTimer(setPanel, timerRef);
    const startTime = Date.now();

    try {
      const finalPrompt = buildFinalPrompt(userPrompt, panel.templateId);
      const isVideo = isVideoModel(model);
      const needsRef = modelNeedsRef(model);
      const multiRef = model.capabilities?.requires_image_urls_array;

      // Build input with reference images
      const input: Record<string, any> = {};
      if (needsRef && panel.referenceImages.length > 0) {
        if (multiRef) {
          input.image_urls = panel.referenceImages.map(r => r.url);
        } else {
          input.image_url = panel.referenceImages[0].url;
        }
      }

      const { data, error } = await supabase.functions.invoke('fal-image', {
        body: {
          prompt: finalPrompt,
          apiModelId: panel.modelId,
          job_type: isVideo ? 'video' : 'image_high',
          input,
          metadata: { source: 'playground-image-compare' },
        },
      });

      const elapsed = Date.now() - startTime;
      stopTimer(timerRef);

      if (error) throw error;
      if (!data?.resultUrl) throw new Error('No result URL returned');

      const gen: Generation = {
        id: data.jobId || crypto.randomUUID(),
        prompt: userPrompt,
        mediaUrl: data.resultUrl,
        isVideo: isVideo || isVideoUrl(data.resultUrl),
        modelName: model.display_name,
        time: elapsed,
        seed: data.seed || null,
      };

      setPanel(prev => ({
        ...prev,
        generations: [...prev.generations, gen],
        isLoading: false,
      }));
    } catch (err) {
      stopTimer(timerRef);
      console.error('❌ Generation error:', err);
      setPanel(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    const msg = prompt.trim();
    setPrompt('');
    if (canSubmitPanel(panelA)) generateForPanel(panelA, setPanelA, timerRefA, msg);
    if (canSubmitPanel(panelB)) generateForPanel(panelB, setPanelB, timerRefB, msg);
  };

  const handleClear = (setPanel: React.Dispatch<React.SetStateAction<PanelState>>) => {
    setPanel(prev => ({ ...prev, generations: [], referenceImages: [] }));
  };

  // Clear ref images when model changes to one that doesn't need them
  const handleModelChange = (
    modelId: string,
    setPanel: React.Dispatch<React.SetStateAction<PanelState>>
  ) => {
    setPanel(prev => {
      const model = getModelById(modelId);
      const needsRef = model ? modelNeedsRef(model) : false;
      return {
        ...prev,
        modelId,
        referenceImages: needsRef ? prev.referenceImages : [],
      };
    });
  };

  // Group templates by use_case
  const groupedTemplates = templates.reduce<Record<string, PromptTemplate[]>>((acc, t) => {
    (acc[t.use_case] = acc[t.use_case] || []).push(t);
    return acc;
  }, {});

  const bothNone = !panelIsActive(panelA) && !panelIsActive(panelB);
  const neitherCanSubmit = !canSubmitPanel(panelA) && !canSubmitPanel(panelB);

  const renderModelDropdown = (
    panel: PanelState,
    setPanel: React.Dispatch<React.SetStateAction<PanelState>>
  ) => (
    <Select
      value={panel.modelId || NONE_VALUE}
      onValueChange={(v) => handleModelChange(v === NONE_VALUE ? NONE_VALUE : v, setPanel)}
    >
      <SelectTrigger className="h-7 text-xs flex-1">
        <SelectValue placeholder="Select model..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_VALUE} className="text-xs text-muted-foreground">
          None (disabled)
        </SelectItem>
        {t2iModels.length > 0 && (
          <SelectGroup>
            <SelectLabel className="text-[11px] text-muted-foreground">Text-to-Image</SelectLabel>
            {t2iModels.map(m => (
              <SelectItem key={m.id} value={m.id} className="text-xs">{m.display_name}</SelectItem>
            ))}
          </SelectGroup>
        )}
        {i2iModels.length > 0 && (
          <SelectGroup>
            <SelectLabel className="text-[11px] text-muted-foreground">Image-to-Image</SelectLabel>
            {i2iModels.map(m => (
              <SelectItem key={m.id} value={m.id} className="text-xs">{m.display_name}</SelectItem>
            ))}
          </SelectGroup>
        )}
        {i2vModels.length > 0 && (
          <SelectGroup>
            <SelectLabel className="text-[11px] text-muted-foreground">Image-to-Video</SelectLabel>
            {i2vModels.map(m => (
              <SelectItem key={m.id} value={m.id} className="text-xs">{m.display_name}</SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );

  const renderPanel = (
    panel: PanelState,
    setPanel: React.Dispatch<React.SetStateAction<PanelState>>,
    label: string,
    scrollRef: React.RefObject<HTMLDivElement>
  ) => {
    const isActive = panelIsActive(panel);
    const model = getModelById(panel.modelId);
    const needsRef = model ? modelNeedsRef(model) : false;
    const maxSlots = model ? getMaxSlots(model) : 1;
    const refMissing = needsRef && panel.referenceImages.length === 0;

    return (
      <div className={`flex-1 flex flex-col min-w-0 border-border ${!isActive ? 'opacity-50' : ''}`}>
        <div className="p-2 border-b border-border space-y-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-[11px] text-muted-foreground shrink-0">{label}</Label>
            {renderModelDropdown(panel, setPanel)}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 text-muted-foreground"
              onClick={() => handleClear(setPanel)}
              title="Clear history"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              New
            </Button>
            {refMissing && (
              <Tooltip>
                <TooltipTrigger>
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                </TooltipTrigger>
                <TooltipContent>Reference image required</TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Template selector */}
          {isActive && (
            <Select
              value={panel.templateId}
              onValueChange={(v) => setPanel(prev => ({ ...prev, templateId: v === NONE_VALUE ? '' : v }))}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Prompt template (optional)..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE} className="text-xs text-muted-foreground">No template</SelectItem>
                {Object.entries(groupedTemplates).map(([useCase, tpls]) => (
                  <SelectGroup key={useCase}>
                    <SelectLabel className="text-[11px] text-muted-foreground">{useCase}</SelectLabel>
                    {tpls.map(t => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">
                        {t.template_name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Reference image slots */}
          {isActive && needsRef && (
            <ReferenceImageSlots
              images={panel.referenceImages}
              onChange={(imgs) => setPanel(prev => ({ ...prev, referenceImages: imgs }))}
              maxSlots={maxSlots}
              required
            />
          )}
        </div>

        {/* Generation history */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
          {!isActive ? (
            <p className="text-xs text-muted-foreground text-center mt-8">Panel disabled</p>
          ) : panel.generations.length === 0 && !panel.isLoading ? (
            <p className="text-xs text-muted-foreground text-center mt-8">
              Select a model and send a prompt to generate.
            </p>
          ) : (
            <>
              {panel.generations.map((gen) => (
                <div key={gen.id} className="space-y-1">
                  <p className="text-[11px] text-muted-foreground truncate" title={gen.prompt}>
                    {gen.prompt}
                  </p>
                  <div
                    className="relative group cursor-pointer rounded overflow-hidden border border-border"
                    onClick={() => {
                      setLightboxUrl(gen.mediaUrl);
                      setLightboxIsVideo(gen.isVideo);
                    }}
                  >
                    {gen.isVideo ? (
                      <video
                        src={gen.mediaUrl}
                        controls
                        className="w-full h-auto"
                        preload="metadata"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        <img
                          src={gen.mediaUrl}
                          alt={gen.prompt}
                          className="w-full h-auto"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{gen.modelName}</span>
                    <span>•</span>
                    <span>{(gen.time / 1000).toFixed(1)}s</span>
                    {gen.seed && (
                      <>
                        <span>•</span>
                        <span>Seed: {gen.seed}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {panel.isLoading && (
                <div className="flex flex-col items-center gap-2 py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">
                    Generating... {(panel.elapsedMs / 1000).toFixed(1)}s
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border overflow-hidden">
        {renderPanel(panelA, setPanelA, 'A', scrollRefA)}
        {renderPanel(panelB, setPanelB, 'B', scrollRefB)}
      </div>

      {/* Shared prompt input */}
      <div className="border-t border-border p-3">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex items-end gap-2">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={bothNone ? 'Select at least one model...' : 'Enter prompt to send to active panels...'}
            className="min-h-[40px] max-h-[120px] resize-none text-sm flex-1"
            disabled={bothNone}
          />
          <Button
            type="submit"
            disabled={!prompt.trim() || neitherCanSubmit || panelA.isLoading || panelB.isLoading}
            size="sm"
            className="h-8 w-8 p-0"
          >
            <Send className="h-3 w-3" />
          </Button>
        </form>
      </div>

      {/* Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
        <DialogContent className="max-w-4xl p-1 bg-background/95">
          {lightboxUrl && (
            lightboxIsVideo ? (
              <video src={lightboxUrl} controls autoPlay className="w-full h-auto rounded" />
            ) : (
              <img src={lightboxUrl} alt="Generated" className="w-full h-auto rounded" />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
