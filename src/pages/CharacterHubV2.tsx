import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CharacterCard } from '@/components/characters/CharacterCard';
import { CharacterFilters } from '@/components/characters/CharacterFilters';
import { CharacterHubSidebar } from '@/components/characters/CharacterHubSidebar';
import { CharacterCreatePanel } from '@/components/characters/CharacterCreatePanel';
import { CharacterHubFilters, CharacterV2 } from '@/types/character-hub-v2';
import { Button } from '@/components/ui/button';
import { Plus, Users, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CharacterHubV2() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();

    // Selected character state
    const [selectedCharacter, setSelectedCharacter] = useState<CharacterV2 | null>(null);

    // Filter State
    const [filters, setFilters] = useState<CharacterHubFilters>({
        search: '',
        genres: [],
        contentRating: 'all',
        mediaReady: false
    });

    // Fetch Characters
    const { data: characters, isLoading, refetch } = useQuery({
        queryKey: ['character-hub-v2', user?.id],
        queryFn: async () => {
            if (!user) return [];

            const { data, error } = await supabase
                .from('characters')
                .select(`
                    *,
                    character_anchors(*)
                `)
                .eq('user_id', user.id)
                .neq('role', 'user')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching characters:', error);
                toast({
                    title: 'Error loading characters',
                    description: error.message,
                    variant: 'destructive'
                });
                throw error;
            }

            return data as unknown as CharacterV2[];
        },
        enabled: !!user
    });

    // Client-side filtering
    const filteredCharacters = useMemo(() => {
        if (!characters) return [];

        return characters.filter(char => {
            // Search filter
            if (filters.search) {
                const query = filters.search.toLowerCase();
                const matchesName = char.name.toLowerCase().includes(query);
                const matchesTagline = char.description?.toLowerCase().includes(query);
                const matchesTags = char.appearance_tags?.some(tag => tag.toLowerCase().includes(query));

                if (!matchesName && !matchesTagline && !matchesTags) return false;
            }

            // Genre filter
            if (filters.genres && filters.genres.length > 0) {
                const hasGenre = filters.genres.some(genre =>
                    char.category?.toLowerCase() === genre.toLowerCase() ||
                    char.appearance_tags?.some(tag => tag.toLowerCase() === genre.toLowerCase())
                );
                if (!hasGenre) return false;
            }

            // Content Rating filter
            if (filters.contentRating && filters.contentRating !== 'all') {
                const charRating = char.content_rating || 'sfw';
                if (charRating !== filters.contentRating) return false;
            }

            // Media Ready filter
            if (filters.mediaReady) {
                if (!char.image_url) return false;
            }

            return true;
        });
    }, [characters, filters]);

    // Handlers
    const handleSelect = (character: CharacterV2) => {
        setSelectedCharacter(character);
    };

    const handleEdit = (id: string) => {
        navigate(`/character-studio-v2/${id}`);
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase.from('characters').delete().eq('id', id);
            if (error) throw error;

            toast({ title: 'Character deleted', description: 'Character successfully removed.' });
            if (selectedCharacter?.id === id) {
                setSelectedCharacter(null);
            }
            refetch();
        } catch (error: any) {
            toast({
                title: 'Delete failed',
                description: error.message,
                variant: 'destructive'
            });
        }
    };

    const handleDuplicate = async (char: CharacterV2) => {
        try {
            const { id, created_at, updated_at, character_anchors, ...charData } = char;

            const newChar = {
                ...charData,
                name: `${charData.name} (Copy)`,
                user_id: user?.id,
            };

            const { error } = await supabase.from('characters').insert(newChar as any);
            if (error) throw error;

            toast({ title: 'Character duplicated', description: 'Copy created successfully.' });
            refetch();
        } catch (error: any) {
            toast({
                title: 'Duplication failed',
                description: error.message,
                variant: 'destructive'
            });
        }
    };

    const handleFilterChange = (newFilters: CharacterHubFilters) => {
        setFilters(newFilters);
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col overflow-hidden">
            {/* Header */}
            <div className="h-12 border-b border-border/50 flex items-center justify-between px-4 bg-background/95 backdrop-blur z-50">
                <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-primary" />
                    <div>
                        <h1 className="text-sm font-semibold leading-none">Character Hub</h1>
                        <p className="text-[10px] text-muted-foreground">
                            Manage consistent characters for your stories, comics, and videos.
                        </p>
                    </div>
                </div>

                <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-xs h-7 gap-1"
                    onClick={() => navigate('/character-studio-v2?mode=create')}
                >
                    <Plus className="w-3 h-3" />
                    Create Character
                </Button>
            </div>

            {/* Main 3-Panel Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar - Selected Character */}
                <div className="w-[320px] border-r border-border/50 bg-card/30 flex-shrink-0 hidden lg:block">
                    <CharacterHubSidebar
                        character={selectedCharacter}
                        onClose={() => setSelectedCharacter(null)}
                    />
                </div>

                {/* Center - Character Grid */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    {/* Filters */}
                    <div className="px-4 py-3 border-b border-border/50 bg-background/50">
                        <CharacterFilters
                            filters={filters}
                            onFilterChange={handleFilterChange}
                            className="max-w-none"
                        />
                    </div>

                    {/* Grid Content */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <Loader2 className="w-6 h-6 animate-spin text-primary mb-3" />
                                <p className="text-xs text-muted-foreground">Loading characters...</p>
                            </div>
                        ) : !filteredCharacters || filteredCharacters.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border/30 rounded-lg bg-card/20">
                                <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mb-3">
                                    <Users className="w-5 h-5 text-muted-foreground/50" />
                                </div>
                                <h3 className="text-sm font-medium text-foreground mb-1">No characters found</h3>
                                <p className="text-[10px] text-muted-foreground mb-4 text-center max-w-xs">
                                    {characters?.length === 0
                                        ? "Create your first AI character to get started."
                                        : "No characters match your filters."}
                                </p>
                                {characters?.length === 0 && (
                                    <Button
                                        size="sm"
                                        onClick={() => navigate('/character-studio-v2?mode=create')}
                                    >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Create Character
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                                {filteredCharacters.map((character) => (
                                    <div
                                        key={character.id}
                                        className={`cursor-pointer transition-all ${selectedCharacter?.id === character.id ? 'ring-2 ring-primary rounded-lg' : ''}`}
                                        onClick={() => handleSelect(character)}
                                    >
                                        <CharacterCard
                                            character={character}
                                            context="hub"
                                            onSelect={() => handleSelect(character)}
                                            onEdit={() => handleEdit(character.id)}
                                            onDelete={() => handleDelete(character.id)}
                                            onDuplicate={() => handleDuplicate(character)}
                                            onGenerate={() => navigate(`/character-studio-v2/${character.id}`)}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel - Create & History */}
                <div className="w-[280px] border-l border-border/50 bg-card/30 flex-shrink-0 hidden lg:block">
                    <CharacterCreatePanel recentCharacters={characters?.slice(0, 9) || []} />
                </div>
            </div>

            {/* Mobile Selected Character Drawer */}
            {selectedCharacter && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setSelectedCharacter(null)}
                    />
                    <div className="absolute right-0 top-0 bottom-0 w-[320px] bg-background border-l border-border/50">
                        <CharacterHubSidebar
                            character={selectedCharacter}
                            onClose={() => setSelectedCharacter(null)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
