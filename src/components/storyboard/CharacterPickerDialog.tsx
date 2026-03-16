/**
 * CharacterPickerDialog
 *
 * Simple dialog to select a character for the storyboard project.
 * Fetches user's characters and allows selection.
 */

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, User, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Character } from '@/types/roleplay';
import { cn } from '@/lib/utils';

interface CharacterPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCharacterId?: string;
  onSelect: (character: Character) => void;
}

export const CharacterPickerDialog: React.FC<CharacterPickerDialogProps> = ({
  open,
  onOpenChange,
  selectedCharacterId,
  onSelect,
}) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      loadCharacters();
    }
  }, [open]);

  const loadCharacters = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('characters')
        .select('id, name, description, reference_image_url, image_url, role')
        .order('updated_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setCharacters(data as Character[]);
      }
    } finally {
      setLoading(false);
    }
  };

  const filtered = search.trim()
    ? characters.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
      )
    : characters;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-base">Select Character</DialogTitle>
        </DialogHeader>

        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search characters..."
            className="h-8 pl-8 text-xs bg-muted border-border"
          />
        </div>

        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              {search ? 'No characters match' : 'No characters found'}
            </p>
          ) : (
            <div className="space-y-1">
              {filtered.map((char) => (
                <button
                  key={char.id}
                  className={cn(
                    'w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors',
                    'hover:bg-muted/50',
                    char.id === selectedCharacterId && 'bg-primary/10 border border-primary/30'
                  )}
                  onClick={() => onSelect(char)}
                >
                  <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                    {char.reference_image_url || char.image_url ? (
                      <img
                        src={char.reference_image_url || char.image_url || ''}
                        alt={char.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{char.name}</p>
                    {char.description && (
                      <p className="text-[10px] text-muted-foreground truncate">{char.description}</p>
                    )}
                  </div>
                  {char.id === selectedCharacterId && (
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs"
          onClick={() => onOpenChange(false)}
        >
          {selectedCharacterId ? 'Done' : 'Cancel'}
        </Button>
      </DialogContent>
    </Dialog>
  );
};