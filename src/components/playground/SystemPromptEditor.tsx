import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { hydrateTemplate, type CharacterRow } from '@/utils/hydrateTemplate';

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

interface SystemPromptEditorProps {
  conversationId: string | null;
  onSystemPromptChange: (prompt: string) => void;
}

export const SystemPromptEditor: React.FC<SystemPromptEditorProps> = ({
  conversationId,
  onSystemPromptChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [characters, setCharacters] = useState<CharacterOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  const rawTemplateRef = useRef<string>('');

  // Load from localStorage keyed by conversation
  useEffect(() => {
    if (!conversationId) {
      setSystemPrompt('');
      return;
    }
    const stored = localStorage.getItem(`sys-prompt-${conversationId}`);
    if (stored) {
      setSystemPrompt(stored);
      onSystemPromptChange(stored);
    } else {
      setSystemPrompt('');
      onSystemPromptChange('');
    }
  }, [conversationId]);

  // Fetch templates and characters on mount
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

  const handleChange = (value: string) => {
    setSystemPrompt(value);
    onSystemPromptChange(value);
    if (conversationId) {
      localStorage.setItem(`sys-prompt-${conversationId}`, value);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    rawTemplateRef.current = tpl.system_prompt;

    // If a character is already selected, hydrate immediately
    if (selectedCharacterId) {
      const char = characters.find((c) => c.id === selectedCharacterId);
      if (char) {
        handleChange(hydrateTemplate(tpl.system_prompt, char));
        return;
      }
    }
    handleChange(tpl.system_prompt);
  };

  const handleCharacterSelect = (characterId: string) => {
    setSelectedCharacterId(characterId);
    const char = characters.find((c) => c.id === characterId);
    if (!char) return;

    const source = rawTemplateRef.current || systemPrompt;
    handleChange(hydrateTemplate(source, char));
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

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>
          System Prompt
          {systemPrompt && (
            <span className="ml-1 text-[11px] opacity-60">
              ({systemPrompt.length} chars)
            </span>
          )}
        </span>
        {isExpanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>
      {isExpanded && (
        <div className="px-3 pb-2 space-y-1.5">
          {/* Template selector */}
          <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Load template..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(groupedTemplates).map(([useCase, tpls]) => (
                <SelectGroup key={useCase}>
                  <SelectLabel className="text-[11px] text-muted-foreground">{useCase}</SelectLabel>
                  {tpls.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.template_name}
                      {t.target_model && (
                        <span className="ml-1 text-[10px] text-muted-foreground">({t.target_model})</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>

          {/* Character selector */}
          <Select value={selectedCharacterId} onValueChange={handleCharacterSelect}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Hydrate with character..." />
            </SelectTrigger>
            <SelectContent>
              {characters.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  {c.name}{genderLabel(c.gender)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Textarea
            value={systemPrompt}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Enter a custom system prompt to control AI behavior..."
            className="min-h-[60px] max-h-[120px] text-xs resize-none"
            rows={3}
          />
        </div>
      )}
    </div>
  );
};
