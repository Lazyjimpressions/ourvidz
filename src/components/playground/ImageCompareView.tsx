import React, { useState, useEffect, useRef } from 'react';
import { Send, RotateCcw, Loader2, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useImageModels } from '@/hooks/useApiModels';

interface PromptTemplate {
  id: string;
  template_name: string;
  use_case: string;
  system_prompt: string;
}

interface Generation {
  id: string;
  prompt: string;
  imageUrl: string;
  modelName: string;
  time: number;
  seed: number | null;
}

interface PanelState {
  modelId: string;
  templateId: string;
  generations: Generation[];
  isLoading: boolean;
  elapsedMs: number;
}

const defaultPanel = (modelId: string): PanelState => ({
  modelId,
  templateId: '',
  generations: [],
  isLoading: false,
  elapsedMs: 0,
});

export const ImageCompareView: React.FC = () => {
  const { data: imageModels = [] } = useImageModels();

  const [panelA, setPanelA] = useState<PanelState>(() =>
    defaultPanel(imageModels[0]?.id || '')
  );
  const [panelB, setPanelB] = useState<PanelState>(() =>
    defaultPanel(imageModels[1]?.id || imageModels[0]?.id || '')
  );
  const [prompt, setPrompt] = useState('');
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const scrollRefA = useRef<HTMLDivElement>(null);
  const scrollRefB = useRef<HTMLDivElement>(null);
  const timerRefA = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRefB = useRef<ReturnType<typeof setInterval> | null>(null);

  // Set default models once loaded
  useEffect(() => {
    if (imageModels.length > 0) {
      setPanelA(prev => prev.modelId ? prev : { ...prev, modelId: imageModels[0].id });
      setPanelB(prev => prev.modelId ? prev : { ...prev, modelId: imageModels[1]?.id || imageModels[0].id });
    }
  }, [imageModels]);

  // Fetch prompt templates
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('prompt_templates')
        .select('id, template_name, use_case, system_prompt')
        .eq('is_active', true)
        .order('use_case')
        .order('template_name');
      if (data) setTemplates(data);
    };
    fetch();
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
    if (!templateId || templateId === '__none__') return userPrompt;
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return userPrompt;
    return `${tpl.system_prompt}\n\n${userPrompt}`;
  };

  const generateForPanel = async (
    panel: PanelState,
    setPanel: React.Dispatch<React.SetStateAction<PanelState>>,
    timerRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>,
    userPrompt: string
  ) => {
    if (!panel.modelId) return;

    setPanel(prev => ({ ...prev, isLoading: true }));
    startTimer(setPanel, timerRef);
    const startTime = Date.now();

    try {
      const finalPrompt = buildFinalPrompt(userPrompt, panel.templateId);
      const model = imageModels.find(m => m.id === panel.modelId);

      const { data, error } = await supabase.functions.invoke('fal-image', {
        body: {
          prompt: finalPrompt,
          apiModelId: panel.modelId,
          job_type: 'image_high',
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
        imageUrl: data.resultUrl,
        modelName: model?.display_name || 'Unknown',
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
      console.error('Image generation error:', err);
      setPanel(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || panelA.isLoading || panelB.isLoading) return;
    const msg = prompt.trim();
    setPrompt('');
    generateForPanel(panelA, setPanelA, timerRefA, msg);
    generateForPanel(panelB, setPanelB, timerRefB, msg);
  };

  const handleClear = (setPanel: React.Dispatch<React.SetStateAction<PanelState>>) => {
    setPanel(prev => ({ ...prev, generations: [] }));
  };

  // Group templates by use_case
  const groupedTemplates = templates.reduce<Record<string, PromptTemplate[]>>((acc, t) => {
    (acc[t.use_case] = acc[t.use_case] || []).push(t);
    return acc;
  }, {});

  const renderPanel = (
    panel: PanelState,
    setPanel: React.Dispatch<React.SetStateAction<PanelState>>,
    label: string,
    scrollRef: React.RefObject<HTMLDivElement>
  ) => (
    <div className="flex-1 flex flex-col min-w-0 border-border">
      <div className="p-2 border-b border-border space-y-1.5">
        <div className="flex items-center gap-2">
          <Label className="text-[11px] text-muted-foreground shrink-0">{label}</Label>
          <Select
            value={panel.modelId}
            onValueChange={(v) => setPanel(prev => ({ ...prev, modelId: v }))}
          >
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue placeholder="Image model..." />
            </SelectTrigger>
            <SelectContent>
              {imageModels.map(m => (
                <SelectItem key={m.id} value={m.id} className="text-xs">
                  {m.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        </div>

        {/* Template selector */}
        <Select
          value={panel.templateId}
          onValueChange={(v) => setPanel(prev => ({ ...prev, templateId: v === '__none__' ? '' : v }))}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Prompt template (optional)..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-xs text-muted-foreground">No template</SelectItem>
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
      </div>

      {/* Generation history */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {panel.generations.length === 0 && !panel.isLoading ? (
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
                  onClick={() => setLightboxUrl(gen.imageUrl)}
                >
                  <img
                    src={gen.imageUrl}
                    alt={gen.prompt}
                    className="w-full h-auto"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
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
            placeholder="Enter image prompt to send to both models..."
            className="min-h-[40px] max-h-[120px] resize-none text-sm flex-1"
          />
          <Button
            type="submit"
            disabled={!prompt.trim() || panelA.isLoading || panelB.isLoading}
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
            <img src={lightboxUrl} alt="Generated" className="w-full h-auto rounded" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
