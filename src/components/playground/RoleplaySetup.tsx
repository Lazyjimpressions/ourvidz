import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface RoleplayTemplate {
  id: string;
  name: string;
  userCharacter: string;
  aiCharacter: string;
  scenario: string;
  systemPrompt: string;
}

const templates: RoleplayTemplate[] = [
  {
    id: 'fantasy',
    name: 'Fantasy Adventure',
    userCharacter: 'A brave adventurer',
    aiCharacter: 'Various NPCs and creatures',
    scenario: 'You find yourself in a bustling medieval tavern as rumors spread of an ancient treasure...',
    systemPrompt: 'You are a fantasy adventure AI. Create immersive medieval fantasy scenarios with rich world-building, NPCs, and adventure elements.',
  },
  {
    id: 'scifi',
    name: 'Sci-Fi Scenario',
    userCharacter: 'A space explorer',
    aiCharacter: 'Aliens and AI systems',
    scenario: 'Your spacecraft has detected an unknown signal from a distant planet...',
    systemPrompt: 'You are a sci-fi roleplay AI. Create futuristic scenarios with advanced technology, alien encounters, and space exploration.',
  },
  {
    id: 'modern',
    name: 'Modern Setting',
    userCharacter: 'A modern person',
    aiCharacter: 'People in everyday situations',
    scenario: 'You are starting a new day in the city...',
    systemPrompt: 'You are a modern setting roleplay AI. Create realistic contemporary scenarios with relatable characters and situations.',
  },
  {
    id: 'mystery',
    name: 'Mystery/Detective',
    userCharacter: 'A detective',
    aiCharacter: 'Suspects and witnesses',
    scenario: 'A crime has been committed and you must investigate...',
    systemPrompt: 'You are a mystery roleplay AI. Create intriguing mysteries with clues, suspects, and plot twists.',
  },
  {
    id: 'artistic',
    name: 'Artistic Expression',
    userCharacter: 'A creative individual exploring artistic expression',
    aiCharacter: 'An artistic collaborator and muse',
    scenario: 'You meet in a sophisticated art gallery during an intimate evening exhibition, surrounded by provocative contemporary works that inspire deep conversation about creativity, passion, and artistic expression...',
    systemPrompt: 'You are an artistic roleplay AI focused on mature creative expression. Engage in sophisticated storytelling that explores emotional depth, artistic passion, and creative collaboration while maintaining appropriate boundaries.',
  },
];

interface RoleplaySetupProps {
  onStartRoleplay: (template: RoleplayTemplate) => void;
}

export const RoleplaySetup: React.FC<RoleplaySetupProps> = ({ onStartRoleplay }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [userCharacter, setUserCharacter] = useState('');
  const [aiCharacter, setAiCharacter] = useState('');
  const [scenario, setScenario] = useState('');

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setUserCharacter(template.userCharacter);
      setAiCharacter(template.aiCharacter);
      setScenario(template.scenario);
    }
  };

  const handleStart = () => {
    const template = templates.find(t => t.id === selectedTemplate);
    if (template) {
      const customTemplate: RoleplayTemplate = {
        ...template,
        userCharacter,
        aiCharacter,
        scenario,
      };
      onStartRoleplay(customTemplate);
      setIsOpen(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between h-8">
          Roleplay Setup
          <ChevronDown className="h-3 w-3" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="mt-2 border-gray-800 bg-gray-900/50">
          <CardHeader className="p-3">
            <CardTitle className="text-sm">Setup Roleplay Session</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Template</label>
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id} className="text-xs">
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Your Character</label>
              <Input
                value={userCharacter}
                onChange={(e) => setUserCharacter(e.target.value)}
                placeholder="Describe your character..."
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">AI Character/Role</label>
              <Input
                value={aiCharacter}
                onChange={(e) => setAiCharacter(e.target.value)}
                placeholder="Describe AI's role..."
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Scenario</label>
              <Textarea
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                placeholder="Describe the setting and situation..."
                className="min-h-[60px] text-xs resize-none"
              />
            </div>

            <Button 
              onClick={handleStart}
              disabled={!selectedTemplate || !userCharacter || !scenario}
              size="sm"
              className="w-full h-8 text-xs"
            >
              Start Roleplay
            </Button>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
};