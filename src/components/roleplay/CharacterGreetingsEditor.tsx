import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CharacterGreetingsEditorProps {
  firstMessage: string;
  alternateGreetings: string[];
  onFirstMessageChange: (value: string) => void;
  onAlternateGreetingsChange: (greetings: string[]) => void;
  className?: string;
}

export const CharacterGreetingsEditor: React.FC<CharacterGreetingsEditorProps> = ({
  firstMessage,
  alternateGreetings,
  onFirstMessageChange,
  onAlternateGreetingsChange,
  className
}) => {
  const handleAddGreeting = () => {
    onAlternateGreetingsChange([...alternateGreetings, '']);
  };

  const handleRemoveGreeting = (index: number) => {
    const updated = alternateGreetings.filter((_, i) => i !== index);
    onAlternateGreetingsChange(updated);
  };

  const handleUpdateGreeting = (index: number, value: string) => {
    const updated = [...alternateGreetings];
    updated[index] = value;
    onAlternateGreetingsChange(updated);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* First Message */}
      <div className="space-y-1.5">
        <Label htmlFor="first-message" className="text-sm">
          First Message
        </Label>
        <Textarea
          id="first-message"
          value={firstMessage}
          onChange={(e) => onFirstMessageChange(e.target.value)}
          placeholder="How this character greets the user when starting a conversation..."
          className="min-h-[80px] text-sm resize-none"
        />
        <p className="text-xs text-muted-foreground">
          The opening message shown when starting a new chat. Leave empty for AI-generated intro.
        </p>
      </div>

      {/* Alternate Greetings */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Alternate Greetings</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAddGreeting}
            className="h-7 text-xs gap-1"
            disabled={alternateGreetings.length >= 5}
          >
            <Plus className="h-3 w-3" />
            Add
          </Button>
        </div>

        {alternateGreetings.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            No alternate greetings. Add variations for variety.
          </p>
        ) : (
          <div className="space-y-2">
            {alternateGreetings.map((greeting, index) => (
              <div key={index} className="flex gap-2">
                <Textarea
                  value={greeting}
                  onChange={(e) => handleUpdateGreeting(index, e.target.value)}
                  placeholder={`Alternate greeting ${index + 1}...`}
                  className="min-h-[60px] text-sm resize-none flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveGreeting(index)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacterGreetingsEditor;
