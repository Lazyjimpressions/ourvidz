import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CharacterCard } from '@/components/characters/CharacterCard';
import { CharacterFilters } from '@/components/characters/CharacterFilters';
import { CharacterHubFilters, CharacterV2, CharacterGenre } from '@/types/character-hub-v2';
import { Button } from '@/components/ui/button';
import { Plus, Users, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { OurVidzDashboardLayout } from '@/components/OurVidzDashboardLayout';

export default function CharacterHubV2() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();

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
                .neq('role', 'user') // Exclude user personas (they live in roleplay settings)
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

            // Genre filter (using tags as proxy for now if no explicit genre field)
            if (filters.genres && filters.genres.length > 0) {
                // Map appearance_tags or category to genres properly
                // For now, we check if any tag matches selected genres
                const hasGenre = filters.genres.some(genre =>
                    char.category?.toLowerCase() === genre.toLowerCase() ||
                    char.appearance_tags?.some(tag => tag.toLowerCase() === genre.toLowerCase())
                );
                // If strict filtering is desired, return false if no match. 
                // For now, let's keep it permissive - if ANY genre matches, show it.
                if (!hasGenre) return false;
            }

            // Content Rating filter
            if (filters.contentRating && filters.contentRating !== 'all') {
                const charRating = char.content_rating || 'sfw'; // Default to sfw
                if (charRating !== filters.contentRating) return false;
            }

            // Media Ready filter (has image)
            if (filters.mediaReady) {
                if (!char.image_url) return false;
            }

            return true;
        });
    }, [characters, filters]);

    // Handlers
    const handleEdit = (id: string) => {
        navigate(`/character-studio-v2/${id}`);
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase.from('characters').delete().eq('id', id);
            if (error) throw error;

            toast({ title: 'Character deleted', description: 'Character successfully removed.' });
            refetch(); // Refresh list
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
            // Exclude ID and timestamps for duplication
            const { id, created_at, updated_at, ...charData } = char;

            const newChar = {
                ...charData,
                name: `${charData.name} (Copy)`,
                user_id: user?.id,
                // Ensure unique constraints handled if any
            };

            const { error } = await supabase.from('characters').insert(newChar);
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

    // Helper for filter change from child component
    const handleFilterChange = (newFilters: CharacterHubFilters) => {
        setFilters(newFilters);
    };

    return (
        <div className="min-h-screen bg-background text-foreground pb-20">

            {/* Header Section */}
            <div className="pt-8 pb-6 px-4 md:px-8 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                            <Users className="w-8 h-8 text-primary" />
                            Character Hub
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm md:text-base">
                            Manage your AI characters, consistency anchors, and style presets.
                        </p>
                    </div>

                    <Button
                        size="lg"
                        className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-105"
                        onClick={() => navigate('/character-studio-v2?mode=from-images')}
                    >
                        <Plus className="mr-2 h-5 w-5" />
                        Create Character
                    </Button>
                </div>

                {/* Filters Component */}
                <div className="mb-8">
                    <CharacterFilters
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        className="rounded-xl border border-white/5 bg-black/40 p-4 shadow-xl backdrop-blur-md"
                    />
                </div>

                {/* Content Area */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 min-h-[400px]">
                        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                        <p className="text-muted-foreground animate-pulse text-lg">Loading your characters...</p>
                    </div>
                ) : !filteredCharacters || filteredCharacters.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-xl bg-black/20 min-h-[400px]">
                        <div className="bg-white/5 p-6 rounded-full mb-4">
                            <Users className="w-12 h-12 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">No characters found</h3>
                        <p className="text-muted-foreground mb-8 text-center max-w-md">
                            {characters?.length === 0
                                ? "You haven't created any AI characters yet. Start by creating your first character!"
                                : "No characters match your current filters. Try adjusting your search criteria."}
                        </p>
                        {characters?.length === 0 && (
                            <Button
                                size="lg"
                                className="bg-primary hover:bg-primary/90"
                                onClick={() => navigate('/character-studio-v2?mode=from-images')}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Create First Character
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-8">
                        {filteredCharacters.map((character) => (
                            <div key={character.id} className="transform transition-all duration-300 hover:-translate-y-1">
                                <CharacterCard
                                    character={character}
                                    context="hub"
                                    onSelect={() => navigate(`/character-studio-v2/${character.id}`)}
                                    onEdit={() => handleEdit(character.id)}
                                    onDelete={() => handleDelete(character.id)}
                                    onDuplicate={() => handleDuplicate(character)}
                                // onGenerate handled internally by card or can be overridden here
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
