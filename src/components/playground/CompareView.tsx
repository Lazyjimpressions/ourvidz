import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useGroupedModels } from '@/hooks/usePlaygroundModels';
import { usePlayground } from '@/contexts/PlaygroundContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface PanelState {
  model: string;
  systemPrompt: string;
  response: string;
  isLoading: boolean;
  responseTime: number | null;
}

const defaultPanel = (model: string): PanelState => ({
  model,
  systemPrompt: '',
  response: '',
  isLoading: false,
  responseTime: null,
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

  const createEphemeralConversation = async (): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        title: 'Compare Session',
        conversation_type: 'general',
      } as any)
      .select('id')
      .single();
    if (error || !data) throw new Error('Failed to create conversation');
    return data.id;
  };

  const sendToPanel = async (
    panel: PanelState,
    setPanel: React.Dispatch<React.SetStateAction<PanelState>>,
    message: string
  ) => {
    setPanel(prev => ({ ...prev, isLoading: true, response: '', responseTime: null }));
    const start = Date.now();
    try {
      const conversationId = await createEphemeralConversation();
      const { data, error } = await supabase.functions.invoke('playground-chat', {
        body: {
          message,
          conversation_id: conversationId,
          model_provider: 'openrouter',
          model_variant: panel.model,
          content_tier: settings.contentMode,
          context_type: 'general',
          system_prompt_override: panel.systemPrompt || undefined,
        },
      });
      const elapsed = Date.now() - start;
      if (error) throw error;
      setPanel(prev => ({
        ...prev,
        response: data?.response || 'No response',
        isLoading: false,
        responseTime: elapsed,
      }));
    } catch (err) {
      const elapsed = Date.now() - start;
      setPanel(prev => ({
        ...prev,
        response: `Error: ${err instanceof Error ? err.message : String(err)}`,
        isLoading: false,
        responseTime: elapsed,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    sendToPanel(panelA, setPanelA, prompt.trim());
    sendToPanel(panelB, setPanelB, prompt.trim());
  };

  const renderPanel = (
    panel: PanelState,
    setPanel: React.Dispatch<React.SetStateAction<PanelState>>,
    label: string
  ) => (
    <div className="flex-1 flex flex-col min-w-0 border-border">
      {/* Panel header */}
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
        </div>
        <Textarea
          value={panel.systemPrompt}
          onChange={(e) => setPanel(prev => ({ ...prev, systemPrompt: e.target.value }))}
          placeholder="System prompt (optional)..."
          className="min-h-[32px] max-h-[60px] text-xs resize-none"
          rows={1}
        />
      </div>

      {/* Response area */}
      <div className="flex-1 overflow-y-auto p-3">
        {panel.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary border-t-transparent" />
            <span className="text-xs">Generating...</span>
          </div>
        ) : panel.response ? (
          <div className="space-y-1">
            {panel.responseTime !== null && (
              <span className="text-[11px] text-muted-foreground">
                {(panel.responseTime / 1000).toFixed(1)}s
              </span>
            )}
            <div className="prose prose-sm dark:prose-invert max-w-none text-xs">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {panel.response}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Send a prompt to compare responses.</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Split panels */}
      <div className="flex-1 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border overflow-hidden">
        {renderPanel(panelA, setPanelA, 'A')}
        {renderPanel(panelB, setPanelB, 'B')}
      </div>

      {/* Shared input */}
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