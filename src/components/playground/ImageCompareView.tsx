import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Send, RotateCcw, Loader2, AlertCircle, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAllVisualModels } from '@/hooks/useApiModels';
import { ReferenceImageSlots, type ReferenceImage } from './ReferenceImageSlots';
import { AssetTile } from '@/components/shared/AssetTile';
import { UnifiedLightbox, type LightboxItem } from '@/components/shared/UnifiedLightbox';
import { QuickRating } from '@/components/QuickRating';
import { usePlaygroundPrompts } from '@/hooks/usePlaygroundPrompts';
import { PromptDrawer } from './PromptDrawer';
import { SavePromptDialog } from './SavePromptDialog';

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
const modelNeedsRef = (model: { modality: string; tasks: string[]; model_key: string }) => {
  if (model.tasks?.includes('i2i') || model.tasks?.includes('i2v') || model.tasks?.includes('extend')) return true;
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
  const t2iModels = useMemo(() => visualModels?.t2i ?? [], [visualModels]);
  const i2iModels = useMemo(() => visualModels?.i2i ?? [], [visualModels]);
  const i2vModels = useMemo(() => visualModels?.i2v ?? [], [visualModels]);
  const t2vModels = useMemo(() => visualModels?.t2v ?? [], [visualModels]);
  const extendModels = useMemo(() => visualModels?.extend ?? [], [visualModels]);
  const multiModels = useMemo(() => visualModels?.multi ?? [], [visualModels]);
  const allModels = useMemo(() => visualModels?.all ?? [], [visualModels]);

  const [panelA, setPanelA] = useState<PanelState>(() => defaultPanel(''));
  const [panelB, setPanelB] = useState<PanelState>(() => defaultPanel(''));
  const [prompt, setPrompt] = useState('');
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxPanel, setLightboxPanel] = useState<'a' | 'b' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const { prompts: savedPrompts, isLoading: promptsLoading, savePrompt, deletePrompt: deletePlaygroundPrompt } = usePlaygroundPrompts();

  // Fetch current user for QuickRating
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

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
    }, 1000);
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

  const getModelById = useCallback((id: string) => allModels.find(m => m.id === id), [allModels]);

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

      // Resolve provider to route to correct edge function
      const providerName = (model as any).api_providers?.name || 'fal';
      const edgeFunction = providerName === 'replicate' ? 'replicate-image' : 'fal-image';

      let requestPayload;
      if (providerName === 'replicate') {
        requestPayload = {
          prompt: finalPrompt,
          apiModelId: panel.modelId,
          jobType: isVideo ? 'video' : 'image_high',
          job_type: isVideo ? 'video' : 'image_high',
          input: { ...input },
          metadata: { source: 'playground-image-compare' },
        };
      } else {
        requestPayload = {
          prompt: finalPrompt,
          apiModelId: panel.modelId,
          job_type: isVideo ? 'video' : 'image_high',
          input,
          metadata: { source: 'playground-image-compare' },
        };
      }

      const { data, error } = await supabase.functions.invoke(edgeFunction, {
        body: requestPayload,
      });

      if (error) throw error;

      let resultUrl: string | null = null;

      if (providerName === 'replicate' && data?.predictionId && !data?.resultUrl) {
        // Replicate returns async — poll for completion
        console.log('⏳ Polling Replicate prediction:', data.predictionId);
        const pollInterval = 2000;
        const maxWait = 300000; // 5 minutes for cold start models like Flux Colossus
        const deadline = Date.now() + maxWait;
        let lastStatus = '';

        while (Date.now() < deadline) {
          await new Promise(r => setTimeout(r, pollInterval));
          const { data: statusData, error: statusError } = await supabase.functions.invoke('replicate-image', {
            body: { predictionId: data.predictionId, apiModelId: panel.modelId },
          });

          if (statusError) {
            console.error('❌ Poll error:', statusError);
            continue;
          }

          if (statusData?.status && statusData.status !== lastStatus) {
            console.log(`🔄 Replicate status: ${lastStatus || 'unknown'} → ${statusData.status}`);
            lastStatus = statusData.status;
          }

          if (statusData?.status === 'succeeded') {
            // Extract URL from output
            const output = statusData.output;
            if (Array.isArray(output) && output.length > 0) {
              resultUrl = typeof output[0] === 'string' ? output[0] : output[0]?.url;
            } else if (typeof output === 'string') {
              resultUrl = output;
            }
            break;
          } else if (statusData?.status === 'failed' || statusData?.status === 'canceled') {
            throw new Error(`Replicate prediction ${statusData.status}: ${statusData.error || 'unknown'}`);
          }
          // else still processing, continue polling
        }

        if (!resultUrl) throw new Error('Replicate prediction timed out');
      } else {
        resultUrl = data?.resultUrl;
      }

      const elapsed = Date.now() - startTime;
      stopTimer(timerRef);

      if (!resultUrl) throw new Error('No result URL returned');

      if (!data.jobId) {
        console.warn('⚠️ No jobId returned from edge function — generation not tracked');
        throw new Error('No jobId returned');
      }

      const gen: Generation = {
        id: data.jobId,
        prompt: userPrompt,
        mediaUrl: resultUrl,
        isVideo: isVideo || isVideoUrl(resultUrl),
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

  // Auto-sync: copy Panel A's ref images to Panel B
  const wasBAutoSynced = useRef(true);
  const isSyncing = useRef(false);

  useEffect(() => {
    if (isSyncing.current) return;
    const modelB = getModelById(panelB.modelId);
    const bNeedsRef = modelB ? modelNeedsRef(modelB) : false;
    if (!bNeedsRef) return;
    if (panelA.referenceImages.length === 0) return;
    if (panelB.referenceImages.length === 0 || wasBAutoSynced.current) {
      isSyncing.current = true;
      const copied = panelA.referenceImages.map(img => ({
        ...img,
        id: crypto.randomUUID(),
      }));
      setPanelB(prev => ({ ...prev, referenceImages: copied }));
      wasBAutoSynced.current = true;
      requestAnimationFrame(() => { isSyncing.current = false; });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelA.referenceImages, panelB.modelId]);

  // When Panel B's model changes to one needing refs, re-sync if empty
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

    // If Panel B just changed to a model needing refs, re-sync from A
    if (setPanel === setPanelB) {
      const model = getModelById(modelId);
      if (model && modelNeedsRef(model)) {
        wasBAutoSynced.current = true;
        if (panelA.referenceImages.length > 0) {
          const copied = panelA.referenceImages.map(img => ({
            ...img,
            id: crypto.randomUUID(),
          }));
          setPanelB(prev => ({ ...prev, referenceImages: copied }));
        }
      }
    }
  };

  // Wrap Panel B's ref image onChange to detect manual edits
  const handlePanelBRefChange = (imgs: ReferenceImage[]) => {
    wasBAutoSynced.current = false;
    setPanelB(prev => ({ ...prev, referenceImages: imgs }));
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
        {t2vModels.length > 0 && (
          <SelectGroup>
            <SelectLabel className="text-[11px] text-muted-foreground">Text-to-Video</SelectLabel>
            {t2vModels.map(m => (
              <SelectItem key={m.id} value={m.id} className="text-xs">{m.display_name}</SelectItem>
            ))}
          </SelectGroup>
        )}
        {extendModels.length > 0 && (
          <SelectGroup>
            <SelectLabel className="text-[11px] text-muted-foreground">Video Extend</SelectLabel>
            {extendModels.map(m => (
              <SelectItem key={m.id} value={m.id} className="text-xs">{m.display_name}</SelectItem>
            ))}
          </SelectGroup>
        )}
        {multiModels.length > 0 && (
          <SelectGroup>
            <SelectLabel className="text-[11px] text-muted-foreground">Multi-Conditioning</SelectLabel>
            {multiModels.map(m => (
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
    panelKey: 'a' | 'b',
    scrollRef: React.RefObject<HTMLDivElement>,
    refChangeOverride?: (imgs: ReferenceImage[]) => void
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
              onChange={refChangeOverride || ((imgs) => setPanel(prev => ({ ...prev, referenceImages: imgs })))}
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
              {panel.generations.map((gen, idx) => (
                <div key={gen.id} className="space-y-1">
                  <p className="text-[11px] text-muted-foreground truncate" title={gen.prompt}>
                    {gen.prompt}
                  </p>
                  <AssetTile
                    src={gen.mediaUrl}
                    alt={gen.prompt}
                    aspectRatio="3/4"
                    isVideo={gen.isVideo}
                    videoSrc={gen.isVideo ? gen.mediaUrl : undefined}
                    onClick={() => {
                      setLightboxIndex(idx);
                      setLightboxPanel(panelKey);
                    }}
                  >
                    {userId && (
                      <div className="absolute bottom-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <QuickRating jobId={gen.id} userId={userId} />
                      </div>
                    )}
                  </AssetTile>
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
        {renderPanel(panelA, setPanelA, 'A', 'a', scrollRefA)}
        {renderPanel(panelB, setPanelB, 'B', 'b', scrollRefB, handlePanelBRefChange)}
      </div>

      {/* Saved prompts drawer + shared prompt input */}
      <div className="border-t border-border">
        <PromptDrawer
          prompts={savedPrompts}
          isLoading={promptsLoading}
          onSelect={(text) => setPrompt(text)}
          onDelete={deletePlaygroundPrompt}
        />
        <div className="p-3 pt-1.5">
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={!prompt.trim()}
                  onClick={() => setSaveDialogOpen(true)}
                >
                  <Bookmark className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save prompt</TooltipContent>
            </Tooltip>
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
      </div>

      {/* Save prompt dialog */}
      <SavePromptDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        promptText={prompt}
        taskType={(() => {
          const modelA = getModelById(panelA.modelId);
          return modelA?.tasks?.[0] || 't2i';
        })()}
        onSave={async (name, tags) => {
          const modelA = getModelById(panelA.modelId);
          const taskType = modelA?.tasks?.[0] || 't2i';
          await savePrompt(name, prompt, tags, taskType);
        }}
      />

      {/* Lightbox */}
      {lightboxIndex !== null && lightboxPanel && (
        <UnifiedLightbox
          items={(lightboxPanel === 'a' ? panelA : panelB).generations.map(g => ({
            id: g.id,
            url: g.mediaUrl,
            type: (g.isVideo ? 'video' : 'image') as 'image' | 'video',
            title: g.modelName,
            prompt: g.prompt,
            modelType: g.modelName,
            metadata: { seed: g.seed, generationTime: g.time },
          }))}
          startIndex={lightboxIndex}
          onClose={() => { setLightboxIndex(null); setLightboxPanel(null); }}
          onIndexChange={setLightboxIndex}
        />
      )}
    </div>
  );
};
