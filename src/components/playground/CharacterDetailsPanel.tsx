import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { X } from 'lucide-react';
import type { Character, RoleplayTemplate } from './RoleplaySetup';

interface CharacterDetailsPanelProps {
  template: RoleplayTemplate | null;
  onUpdateTemplate: (template: RoleplayTemplate) => void;
}

export const CharacterDetailsPanel: React.FC<CharacterDetailsPanelProps> = ({
  template,
  onUpdateTemplate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);

  if (!template) return null;

  const updateCharacter = (field: keyof Character, value: string) => {
    if (!editingCharacter) return;
    
    const updatedCharacter = { ...editingCharacter, [field]: value };
    setEditingCharacter(updatedCharacter);
    
    const updatedTemplate = {
      ...template,
      characters: template.characters.map(char => 
        char.id === editingCharacter.id ? updatedCharacter : char
      )
    };
    onUpdateTemplate(updatedTemplate);
  };

  const updateScenario = (scenario: string) => {
    onUpdateTemplate({ ...template, scenario });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-7 px-2"
        >
          Character Details
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 bg-background border-border">
        <SheetHeader>
          <SheetTitle className="text-sm">Character Details</SheetTitle>
        </SheetHeader>
        
        <div className="mt-4 space-y-4">
          {/* Scenario */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Scenario</label>
            <Textarea
              value={template.scenario}
              onChange={(e) => updateScenario(e.target.value)}
              className="min-h-[60px] text-xs resize-none"
              placeholder="Describe the setting and situation..."
            />
          </div>

          {/* Characters */}
          <div className="space-y-3">
            <label className="text-xs text-muted-foreground block">Characters</label>
            {template.characters.map((character) => (
              <Card key={character.id} className="border-border bg-card/50">
                <CardHeader className="p-3 pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-medium">{character.name || 'Unnamed'}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingCharacter(editingCharacter?.id === character.id ? null : character)}
                      className="h-6 w-6 p-0"
                    >
                      {editingCharacter?.id === character.id ? <X className="h-3 w-3" /> : '✏️'}
                    </Button>
                  </div>
                </CardHeader>
                
                {editingCharacter?.id === character.id && (
                  <CardContent className="p-3 pt-0 space-y-2">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Name</label>
                      <Input
                        value={editingCharacter.name}
                        onChange={(e) => updateCharacter('name', e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Character name"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Personality</label>
                      <Textarea
                        value={editingCharacter.personality}
                        onChange={(e) => updateCharacter('personality', e.target.value)}
                        className="min-h-[50px] text-xs resize-none"
                        placeholder="Personality traits..."
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Background</label>
                      <Textarea
                        value={editingCharacter.background}
                        onChange={(e) => updateCharacter('background', e.target.value)}
                        className="min-h-[50px] text-xs resize-none"
                        placeholder="Character background..."
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Speaking Style</label>
                      <Input
                        value={editingCharacter.speakingStyle}
                        onChange={(e) => updateCharacter('speakingStyle', e.target.value)}
                        className="h-7 text-xs"
                        placeholder="How they speak..."
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Goals</label>
                      <Input
                        value={editingCharacter.goals}
                        onChange={(e) => updateCharacter('goals', e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Character goals..."
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Quirks</label>
                      <Input
                        value={editingCharacter.quirks}
                        onChange={(e) => updateCharacter('quirks', e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Unique traits..."
                      />
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};