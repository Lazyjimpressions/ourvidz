import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Plus, Trash2, Settings, User, Bot } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useCharacterDatabase } from '@/hooks/useCharacterDatabase';

export interface Character {
  id: string;
  name: string;
  role: 'ai' | 'narrator' | 'user';
  personality: string;
  background: string;
  speakingStyle: string;
  visualDescription: string;
  relationships: string;
  goals: string;
  quirks: string;
}

export interface RoleplayTemplate {
  id: string;
  name: string;
  description: string;
  characters: Character[];
  scenario: string;
  isAdult: boolean;
  tags: string[];
}

const baseTemplates: RoleplayTemplate[] = [
  {
    id: 'fantasy',
    name: 'Fantasy Character',
    description: 'Wise magical character for fantasy adventures',
    isAdult: false,
    tags: ['fantasy', 'adventure', 'magic'],
    characters: [
      {
        id: 'fantasy-character',
        name: 'Elara',
        role: 'ai',
        personality: 'Wise, mysterious, helpful',
        background: 'Knowledgeable mage',
        speakingStyle: 'Eloquent and poetic',
        visualDescription: 'Elegant with mystical appearance',
        relationships: 'Respected mentor figure',
        goals: 'To help and guide others',
        quirks: 'Speaks in metaphors'
      }
    ],
    scenario: 'A magical encounter begins...'
  },
  {
    id: 'adult',
    name: 'Adult Character',
    description: 'Sophisticated adult character for mature conversations',
    isAdult: true,
    tags: ['adult', 'nsfw', 'romance'],
    characters: [
      {
        id: 'adult-character',
        name: 'Scarlett',
        role: 'ai',
        personality: 'Confident, sophisticated, direct',
        background: 'Experienced and mature person',
        speakingStyle: 'Direct and confident',
        visualDescription: 'Attractive and well-dressed',
        relationships: 'Values genuine connections',
        goals: 'To have meaningful interactions',
        quirks: 'Values honesty and directness'
      }
    ],
    scenario: 'An adult conversation begins...'
  },
  {
    id: 'romance',
    name: 'Romance Character',
    description: 'Romantic character for emotional connections',
    isAdult: false,
    tags: ['romance', 'relationships', 'emotional'],
    characters: [
      {
        id: 'romance-character',
        name: 'Jordan',
        role: 'ai',
        personality: 'Romantic, thoughtful, emotionally available',
        background: 'Caring and understanding person',
        speakingStyle: 'Warm and genuine',
        visualDescription: 'Attractive with kind eyes',
        relationships: 'Values deep connections',
        goals: 'To build meaningful relationships',
        quirks: 'Enjoys meaningful conversations'
      }
    ],
    scenario: 'A romantic encounter begins...'
  },
  {
    id: 'scifi',
    name: 'Sci-Fi Character',
    description: 'Futuristic space exploration character',
    isAdult: false,
    tags: ['scifi', 'space', 'technology'],
    characters: [
      {
        id: 'scifi-character',
        name: 'Zara',
        role: 'ai',
        personality: 'Confident, tactical, analytical',
        background: 'Space commander and explorer',
        speakingStyle: 'Direct and authoritative',
        visualDescription: 'Athletic with space uniform',
        relationships: 'Respected leader',
        goals: 'To explore and protect',
        quirks: 'Collects alien artifacts'
      }
    ],
    scenario: 'A space exploration mission begins...'
  }
];

interface RoleplaySetupProps {
  onStartRoleplay: (template: RoleplayTemplate) => void;
}

export const RoleplaySetup: React.FC<RoleplaySetupProps> = ({ onStartRoleplay }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customCharacters, setCustomCharacters] = useState<Character[]>([]);
  const [scenario, setScenario] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [multiCharacterMode, setMultiCharacterMode] = useState(false);
  
  const { getUserCharacters, loadCharacterFromDatabase } = useCharacterDatabase();
  const [dbCharacters, setDbCharacters] = useState<any[]>([]);
  const [selectedDbCharacter, setSelectedDbCharacter] = useState<string>('');
  
  // Load database characters on mount
  useEffect(() => {
    const loadCharacters = async () => {
      const characters = await getUserCharacters();
      setDbCharacters(characters);
    };
    loadCharacters();
  }, [getUserCharacters]);

  const handleTemplateSelect = (templateId: string) => {
    const template = baseTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setCustomCharacters([...template.characters]);
      setScenario(template.scenario);
    }
  };

  const addCharacter = () => {
    const newCharacter: Character = {
      id: `char_${Date.now()}`,
      name: '',
      role: 'ai',
      personality: '',
      background: '',
      speakingStyle: '',
      visualDescription: '',
      relationships: '',
      goals: '',
      quirks: ''
    };
    setCustomCharacters([...customCharacters, newCharacter]);
  };

  const updateCharacter = (id: string, field: keyof Character, value: string) => {
    setCustomCharacters(prev => 
      prev.map(char => 
        char.id === id ? { ...char, [field]: value } : char
      )
    );
  };

  const removeCharacter = (id: string) => {
    setCustomCharacters(prev => prev.filter(char => char.id !== id));
  };

  const loadDbCharacter = async (characterId: string) => {
    if (!characterId) return;
    
    const dbCharacter = await loadCharacterFromDatabase(characterId);
    if (dbCharacter) {
      const newCharacter: Character = {
        id: `loaded_${Date.now()}`,
        name: dbCharacter.name,
        role: dbCharacter.role,
        personality: dbCharacter.personality,
        background: dbCharacter.background,
        speakingStyle: dbCharacter.speakingStyle,
        visualDescription: dbCharacter.visualDescription,
        relationships: dbCharacter.relationships,
        goals: dbCharacter.goals,
        quirks: dbCharacter.quirks
      };
      setCustomCharacters(prev => [...prev, newCharacter]);
    }
  };

  const handleStart = () => {
    const template = baseTemplates.find(t => t.id === selectedTemplate);
    if (template && customCharacters.length > 0) {
      const customTemplate: RoleplayTemplate = {
        ...template,
        characters: customCharacters,
        scenario,
      };
      onStartRoleplay(customTemplate);
      setIsOpen(false);
    }
  };

  const currentTemplate = baseTemplates.find(t => t.id === selectedTemplate);
  const isAdultContent = currentTemplate?.isAdult || false;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between h-8">
          🎭 Roleplay Setup
          <ChevronDown className="h-3 w-3" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="mt-2 border-gray-800 bg-gray-900/50">
          <CardHeader className="p-3">
            <CardTitle className="text-sm">Setup Roleplay Session</CardTitle>
            {isAdultContent && (
              <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-800">
                ⚠️ Adult Content Mode - This template enables unrestricted NSFW roleplay
              </div>
            )}
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-4">
            {/* Template Selection */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Template</label>
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {baseTemplates.map((template) => (
                    <SelectItem 
                      key={template.id} 
                      value={template.id} 
                      className={`text-xs ${template.isAdult ? 'text-red-400' : ''}`}
                    >
                      {template.isAdult ? '🔞 ' : ''}{template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Database Character Selection */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Load Saved Character</label>
              <div className="flex gap-2">
                <Select value={selectedDbCharacter} onValueChange={setSelectedDbCharacter}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="Choose a saved character..." />
                  </SelectTrigger>
                  <SelectContent>
                    {dbCharacters.map((character) => (
                      <SelectItem 
                        key={character.id} 
                        value={character.id} 
                        className="text-xs"
                      >
                        {character.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => loadDbCharacter(selectedDbCharacter)}
                  disabled={!selectedDbCharacter}
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs px-3"
                >
                  Load
                </Button>
              </div>
            </div>

            {/* Advanced Options */}
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-400">Advanced Options</Label>
              <Switch
                checked={showAdvanced}
                onCheckedChange={setShowAdvanced}
                className="scale-75"
              />
            </div>

            {showAdvanced && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-gray-400">Multi-Character Mode</Label>
                  <Switch
                    checked={multiCharacterMode}
                    onCheckedChange={setMultiCharacterMode}
                    className="scale-75"
                  />
                </div>
              </div>
            )}

            {/* Character Management */}
            {currentTemplate && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Characters</label>
                  <Button
                    onClick={addCharacter}
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Character
                  </Button>
                </div>

                {customCharacters.map((character, index) => (
                  <Card key={character.id} className="border-gray-700 bg-gray-800/30">
                    <CardHeader className="p-3 pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {character.role === 'ai' ? <Bot className="h-3 w-3 text-blue-400" /> : 
                           character.role === 'narrator' ? <Settings className="h-3 w-3 text-purple-400" /> :
                           <User className="h-3 w-3 text-green-400" />}
                          <Input
                            value={character.name}
                            onChange={(e) => updateCharacter(character.id, 'name', e.target.value)}
                            placeholder="Character name..."
                            className="h-6 text-xs w-32"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={character.role}
                            onValueChange={(value: 'ai' | 'narrator' | 'user') => 
                              updateCharacter(character.id, 'role', value)
                            }
                          >
                            <SelectTrigger className="h-6 text-xs w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ai" className="text-xs">AI</SelectItem>
                              <SelectItem value="narrator" className="text-xs">Narrator</SelectItem>
                              <SelectItem value="user" className="text-xs">User</SelectItem>
                            </SelectContent>
                          </Select>
                          {customCharacters.length > 1 && (
                            <Button
                              onClick={() => removeCharacter(character.id)}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Personality</label>
                          <Textarea
                            value={character.personality}
                            onChange={(e) => updateCharacter(character.id, 'personality', e.target.value)}
                            placeholder="Describe personality..."
                            className="min-h-[40px] text-xs resize-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Background</label>
                          <Textarea
                            value={character.background}
                            onChange={(e) => updateCharacter(character.id, 'background', e.target.value)}
                            placeholder="Character background..."
                            className="min-h-[40px] text-xs resize-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Speaking Style</label>
                        <Input
                          value={character.speakingStyle}
                          onChange={(e) => updateCharacter(character.id, 'speakingStyle', e.target.value)}
                          placeholder="How does this character speak?"
                          className="h-6 text-xs"
                        />
                      </div>
                      {showAdvanced && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Visual Description</label>
                            <Textarea
                              value={character.visualDescription}
                              onChange={(e) => updateCharacter(character.id, 'visualDescription', e.target.value)}
                              placeholder="Physical appearance..."
                              className="min-h-[40px] text-xs resize-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Relationships</label>
                            <Textarea
                              value={character.relationships}
                              onChange={(e) => updateCharacter(character.id, 'relationships', e.target.value)}
                              placeholder="Relationships with others..."
                              className="min-h-[40px] text-xs resize-none"
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Scenario */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Scenario</label>
              <Textarea
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                placeholder="Describe the setting and situation..."
                className="min-h-[80px] text-xs resize-none"
              />
            </div>

            {/* Character Summary */}
            {currentTemplate && (
              <div className="p-2 bg-gray-800/50 rounded border border-gray-700">
                <label className="text-xs text-gray-400 block mb-1">Session Preview</label>
                <div className="text-xs text-gray-300">
                  Characters: {customCharacters.map(c => c.name || 'Unnamed').join(', ')}
                  {scenario && <div className="mt-1">Scenario: {scenario.substring(0, 100)}...</div>}
                </div>
              </div>
            )}

            <Button 
              onClick={handleStart}
              disabled={!selectedTemplate || customCharacters.length === 0 || !scenario}
              size="sm"
              className={`w-full h-8 text-xs ${isAdultContent ? 'bg-red-600 hover:bg-red-700' : ''}`}
            >
              {isAdultContent ? '🔞 Start Adult Roleplay' : '🎬 Start Roleplay'}
            </Button>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
};