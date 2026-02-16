import React, { useState, useEffect, useRef } from 'react';
import { Send, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useGroupedModels } from '@/hooks/usePlaygroundModels';
import { usePlayground } from '@/contexts/PlaygroundContext';
import { hydrateTemplate } from '@/utils/hydrateTemplate';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface PromptTemplate {
  id: string;
  template_name: string;
  use_case: string;
  system_prompt: string;
  target_model: string | null;
}

interface CharacterOption {
  id: string;
  name: string;
  gender: string | null;
  description: string;
  persona: string | null;
  traits: string | null;
  backstory: string | null;
  voice_tone: string | null;
  mood: string | null;
}

interface PanelMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  created_at: string;
}

interface PanelState {
  model: string;
  systemPrompt: string;
  messages: PanelMessage[];
  conversationId: string | null;
  isLoading: boolean;
  responseTime: number | null;
  selectedTemplateId: string;
  selectedCharacterId: string;
}

const defaultPanel = (model: string): PanelState => ({
  model,
  systemPrompt: '',
  messages: [],
  conversationId: null,
  isLoading: false,
  responseTime: null,
  selectedTemplateId: '',
  selectedCharacterId: '',
});

export const CompareView: React.FC = () => {
  const { grouped } = useGroupedModels();
  const { settings } = usePlayground();
  const chatModels = grouped.chat.filter(m => m.model_key);

  const [panelA, setPanelA] = useState<PanelState>(() =>
    defaultPanel(settings.chatModel || chatModels[0]?.model_key || '')
  );
  const [panelB, setPanelB] = useState<PanelState>(() =>
    defaultPanel(chatModels[1]?.model_key || chatModels[0]?.model_key || '')
  );
  const [prompt, setPrompt] = useState('');
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [characters, setCharacters] = useState<CharacterOption[]>([]);
  const rawTemplateRefA = useRef<string>('');
  const rawTemplateRefB = useRef<string>('');
  const scrollRefA = useRef<HTMLDivElement>(null);
  const scrollRefB = useRef<HTMLDivElement>(null);

  // Fetch templates and characters once
  useEffect(() => {
    const fetchData = async () => {
      const [tRes, cRes] = await Promise.all([
        supabase
          .from('prompt_templates')
          .select('id, template_name, use_case, system_prompt, target_model')
          .eq('is_active', true)
          .order('use_case')
          .order('template_name'),
        supabase
          .from('characters')
          .select('id, name, gender, description, persona, traits, backstory, voice_tone, mood')
          .order('name'),
      ]);
      if (tRes.data) setTemplates(tRes.data);
      if (cRes.data) setCharacters(cRes.data);
    };
    fetchData();
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRefA.current?.scrollTo({ top: scrollRefA.current.scrollHeight, behavior: 'smooth' });
  }, [panelA.messages, panelA.isLoading]);
  useEffect(() => {
    scrollRefB.current?.scrollTo({ top: scrollRefB.current.scrollHeight, behavior: 'smooth' });
  }, [panelB.messages, panelB.isLoading]);

  const getOrCreateConversation = async (panel: PanelState, setPanel: React.Dispatch<React.SetStateAction<PanelState>>): Promise<string> => {
    if (panel.conversationId) return panel.conversationId;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const insertData: any = {
      user_id: user.id,
      title: 'Compare Session',
      conversation_type: 'general',
    };
    if (panel.selectedCharacterId) {
      insertData.character_id = panel.selectedCharacterId;
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert(insertData)
      .select('id')
      .single();
    if (error || !data) throw new Error('Failed to create conversation');

    setPanel(prev => ({ ...prev, conversationId: data.id }));
    return data.id;
  };

  const sendToPanel = async (
    panel: PanelState,
    setPanel: React.Dispatch<React.SetStateAction<PanelState>>,
    message: string
  ) => {
    // Append user message immediately
    const userMsg: PanelMessage = {
      id: crypto.randomUUID(),
      content: message,
      sender: 'user',
      created_at: new Date().toISOString(),
    };
    setPanel(prev => ({ ...prev, isLoading: true, responseTime: null, messages: [...prev.messages, userMsg] }));

    const start = Date.now();
    try {
      const conversationId = await getOrCreateConversation(panel, setPanel);

      const body: any = {
        message,
        conversation_id: conversationId,
        model_provider: 'openrouter',
        model_variant: panel.model,
        content_tier: settings.contentMode,
        context_type: 'general',
        system_prompt_override: panel.systemPrompt || undefined,
      };
      if (panel.selectedCharacterId) {
        body.character_id = panel.selectedCharacterId;
      }

      const { data, error } = await supabase.functions.invoke('playground-chat', { body });
      const elapsed = Date.now() - start;
      if (error) throw error;

      const assistantMsg: PanelMessage = {
        id: crypto.randomUUID(),
        content: data?.response || 'No response',
        sender: 'assistant',
        created_at: new Date().toISOString(),
      };
      setPanel(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMsg],
        isLoading: false,
        responseTime: elapsed,
      }));
    } catch (err) {
      const elapsed = Date.now() - start;
      const errorMsg: PanelMessage = {
        id: crypto.randomUUID(),
        content: `Error: ${err instanceof Error ? err.message : String(err)}`,
        sender: 'assistant',
        created_at: new Date().toISOString(),
      };
      setPanel(prev => ({
        ...prev,
        messages: [...prev.messages, errorMsg],
        isLoading: false,
        responseTime: elapsed,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    const msg = prompt.trim();
    setPrompt('');
    sendToPanel(panelA, setPanelA, msg);
    sendToPanel(panelB, setPanelB, msg);
  };

  const handleNewSession = (setPanel: React.Dispatch<React.SetStateAction<PanelState>>) => {
    setPanel(prev => ({ ...prev, conversationId: null, messages: [], responseTime: null }));
  };

  // Group templates by use_case
  const groupedTemplates = templates.reduce<Record<string, PromptTemplate[]>>((acc, t) => {
    (acc[t.use_case] = acc[t.use_case] || []).push(t);
    return acc;
  }, {});

  const genderLabel = (g: string | null) => {
    if (!g || g === 'unspecified') return '';
    return ` (${g.charAt(0).toUpperCase()})`;
  };

  const handleTemplateSelect = (
    templateId: string,
    setPanel: React.Dispatch<React.SetStateAction<PanelState>>,
    rawRef: React.MutableRefObject<string>,
    currentPanel: PanelState
  ) => {
    if (templateId === '__none__') {
      rawRef.current = '';
      setPanel(prev => ({ ...prev, selectedTemplateId: '' }));
      return;
    }
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return;
    rawRef.current = tpl.system_prompt;

    let resolved = tpl.system_prompt;
    if (currentPanel.selectedCharacterId) {
      const char = characters.find(c => c.id === currentPanel.selectedCharacterId);
      if (char) resolved = hydrateTemplate(tpl.system_prompt, char);
    }
    setPanel(prev => ({ ...prev, selectedTemplateId: templateId, systemPrompt: resolved }));
  };

  const handleCharacterSelect = (
    characterId: string,
    setPanel: React.Dispatch<React.SetStateAction<PanelState>>,
    rawRef: React.MutableRefObject<string>,
    currentPanel: PanelState
  ) => {
    if (characterId === '__none__') {
      setPanel(prev => ({
        ...prev,
        selectedCharacterId: '',
        systemPrompt: rawRef.current || prev.systemPrompt,
      }));
      return;
    }
    const char = characters.find(c => c.id === characterId);
    if (!char) return;
    const source = rawRef.current || currentPanel.systemPrompt;
    setPanel(prev => ({ ...prev, selectedCharacterId: characterId, systemPrompt: hydrateTemplate(source, char) }));
  };

  const renderPanel = (
    panel: PanelState,
    setPanel: React.Dispatch<React.SetStateAction<PanelState>>,
    label: string,
    rawRef: React.MutableRefObject<string>,
    scrollRef: React.RefObject<HTMLDivElement>
  ) => (
    <div className="flex-1 flex flex-col min-w-0 border-border">
      <div className="p-2 border-b border-border space-y-1.5">
        <div className="flex items-center gap-2">
          <Label className="text-[11px] text-muted-foreground shrink-0">{label}</Label>
          <Select
            value={panel.model}
            onValueChange={(v) => setPanel(prev => ({ ...prev, model: v }))}
          >
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue placeholder="Model..." />
            </SelectTrigger>
            <SelectContent>
              {chatModels.map(m => (
                <SelectItem key={m.id} value={m.model_key} className="text-xs">
                  {m.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2 text-muted-foreground"
            onClick={() => handleNewSession(setPanel)}
            title="New Session"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            New
          </Button>
        </div>

        {/* Template selector */}
        <Select value={panel.selectedTemplateId} onValueChange={(v) => handleTemplateSelect(v, setPanel, rawRef, panel)}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Load template..." />
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

        {/* Character selector */}
        <Select value={panel.selectedCharacterId} onValueChange={(v) => handleCharacterSelect(v, setPanel, rawRef, panel)}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Hydrate with character..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-xs text-muted-foreground">No character</SelectItem>
            {characters.map(c => (
              <SelectItem key={c.id} value={c.id} className="text-xs">
                {c.name}{genderLabel(c.gender)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Textarea
          value={panel.systemPrompt}
          onChange={(e) => setPanel(prev => ({ ...prev, systemPrompt: e.target.value }))}
          placeholder="System prompt (optional)..."
          className="min-h-[32px] max-h-[60px] text-xs resize-none"
          rows={1}
        />
      </div>

      {/* Message history */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {panel.messages.length === 0 && !panel.isLoading ? (
          <p className="text-xs text-muted-foreground">Send a prompt to compare responses.</p>
        ) : (
          <>
            {panel.messages.map((msg) => (
              <div key={msg.id} className={msg.sender === 'user' ? 'flex justify-end' : ''}>
                <div className={
                  msg.sender === 'user'
                    ? 'bg-muted/50 rounded p-2 max-w-[85%]'
                    : 'max-w-[95%]'
                }>
                  <span className="text-[11px] text-muted-foreground block mb-0.5">
                    {msg.sender === 'user' ? 'You' : 'Assistant'}
                  </span>
                  {msg.sender === 'user' ? (
                    <p className="text-xs whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <>
                      <div className="prose prose-sm dark:prose-invert max-w-none text-xs">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 block">
                        {msg.content.length} chars | ~{Math.ceil(msg.content.length / 4)} tokens
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
            {panel.isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary border-t-transparent" />
                <span className="text-xs">Generating...</span>
              </div>
            )}
            {panel.responseTime !== null && !panel.isLoading && panel.messages.length > 0 && (
              <span className="text-[11px] text-muted-foreground">
                Last response: {(panel.responseTime / 1000).toFixed(1)}s
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border overflow-hidden">
        {renderPanel(panelA, setPanelA, 'A', rawTemplateRefA, scrollRefA)}
        {renderPanel(panelB, setPanelB, 'B', rawTemplateRefB, scrollRefB)}
      </div>

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
            placeholder="Enter prompt to send to both models..."
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
    </div>
  );
};
