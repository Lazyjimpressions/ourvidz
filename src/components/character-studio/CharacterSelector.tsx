import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Users, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';

interface Character {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  content_rating: string;
  is_public: boolean;
  created_at: string;
}

interface CharacterSelectorProps {
  onSelect: (characterId: string) => void;
  onCreateNew: () => void;
  trigger?: React.ReactNode;
}

export function CharacterSelector({ onSelect, onCreateNew, trigger }: CharacterSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { user } = useAuth();

  const { data: characters = [], isLoading } = useQuery({
    queryKey: ['user-characters', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('characters')
        .select('id, name, description, image_url, content_rating, is_public, created_at')
        .eq('user_id', user.id)
        .eq('role', 'ai')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data as Character[];
    },
    enabled: !!user?.id && open
  });

  const filteredCharacters = characters.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (characterId: string) => {
    onSelect(characterId);
    setOpen(false);
    setSearch('');
  };

  const handleCreateNew = () => {
    onCreateNew();
    setOpen(false);
    setSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Users className="w-4 h-4" />
            Select Character
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Select Character</DialogTitle>
          <DialogDescription>
            Choose an existing character to edit or create a new one.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search your characters..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Character List */}
        <ScrollArea className="h-[300px] -mx-4 px-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCharacters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? 'No characters found' : 'No characters yet'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCharacters.map((char) => (
                <button
                  key={char.id}
                  onClick={() => handleSelect(char.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg',
                    'hover:bg-accent transition-colors text-left',
                    'border border-transparent hover:border-border'
                  )}
                >
                  <Avatar className="w-12 h-12 flex-shrink-0">
                    <AvatarImage src={char.image_url || undefined} alt={char.name} />
                    <AvatarFallback>{char.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{char.name}</span>
                      {char.is_public && (
                        <Badge variant="secondary" className="text-xs">Public</Badge>
                      )}
                      <Badge 
                        variant={char.content_rating === 'nsfw' ? 'destructive' : 'outline'}
                        className="text-xs"
                      >
                        {char.content_rating.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {char.description || 'No description'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Create New Button */}
        <Button onClick={handleCreateNew} className="w-full gap-2">
          <Plus className="w-4 h-4" />
          Create New Character
        </Button>
      </DialogContent>
    </Dialog>
  );
}
