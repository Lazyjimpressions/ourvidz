import React from 'react';
import { Search, Filter, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CharacterHubFilters, CharacterGenre, STYLE_PRESET_OPTIONS } from '@/types/character-hub-v2';
import { cn } from '@/lib/utils';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

interface CharacterFiltersProps {
    filters: CharacterHubFilters;
    onFilterChange: (filters: CharacterHubFilters) => void;
    className?: string;
}

const GENRE_OPTIONS: CharacterGenre[] = [
    'Fantasy', 'Sci-Fi', 'Modern', 'Historical', 'Romance', 'Adventure', 'Other'
];

export const CharacterFilters: React.FC<CharacterFiltersProps> = ({
    filters,
    onFilterChange,
    className
}) => {
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onFilterChange({ ...filters, search: e.target.value });
    };

    const handleGenreToggle = (genre: CharacterGenre) => {
        const currentGenres = filters.genres || [];
        const isSelected = currentGenres.includes(genre);

        let newGenres: CharacterGenre[];
        if (isSelected) {
            newGenres = currentGenres.filter(g => g !== genre);
        } else {
            newGenres = [...currentGenres, genre];
        }

        onFilterChange({ ...filters, genres: newGenres });
    };

    const handleClearFilters = () => {
        onFilterChange({
            search: filters.search, // Keep search
            genres: [],
            contentRating: 'all',
            mediaReady: false
        });
    };

    const activeFilterCount = (filters.genres?.length || 0) + (filters.mediaReady ? 1 : 0);

    return (
        <div className={cn("sticky top-0 z-30 bg-background/95 backdrop-blur-md pb-4 pt-2 border-b border-border/50", className)}>
            <div className="flex flex-col gap-4">

                {/* Top Row: Search and Filter Settings */}
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                            type="text"
                            placeholder="Search characters by name or tag..."
                            value={filters.search || ''}
                            onChange={handleSearchChange}
                            className="pl-9 h-10 bg-secondary/50 border-white/10 focus:border-primary/50"
                        />
                    </div>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-10 gap-2 border-white/10 bg-secondary/30">
                                <SlidersHorizontal className="w-4 h-4" />
                                Filters
                                {activeFilterCount > 0 && (
                                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] bg-primary/20 text-primary">
                                        {activeFilterCount}
                                    </Badge>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-64 p-4 bg-card border-border shadow-xl">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-sm">Filter Options</h4>
                                    {activeFilterCount > 0 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-white"
                                            onClick={handleClearFilters}
                                        >
                                            Reset
                                        </Button>
                                    )}
                                </div>
                                <Separator />

                                <div className="space-y-2">
                                    <label className="text-xs text-muted-foreground font-medium">Content Rating</label>
                                    <div className="flex rounded-md bg-secondary/50 p-1">
                                        {(['all', 'sfw', 'nsfw'] as const).map(option => (
                                            <button
                                                key={option}
                                                className={cn(
                                                    "flex-1 text-xs py-1.5 rounded-sm transition-colors",
                                                    filters.contentRating === option
                                                        ? "bg-primary text-primary-foreground shadow-sm"
                                                        : "text-muted-foreground hover:text-white"
                                                )}
                                                onClick={() => onFilterChange({ ...filters, contentRating: option })}
                                            >
                                                {option.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs text-muted-foreground font-medium">Media Status</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="mediaReady"
                                            checked={filters.mediaReady || false}
                                            onChange={(e) => onFilterChange({ ...filters, mediaReady: e.target.checked })}
                                            className="rounded border-white/20 bg-secondary/50 text-primary focus:ring-primary"
                                        />
                                        <label htmlFor="mediaReady" className="text-sm cursor-pointer select-none">
                                            Has Generated Media
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Bottom Row: Genre Chips */}
                <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-muted-foreground self-center mr-1">Genres:</span>
                    {GENRE_OPTIONS.map(genre => (
                        <Badge
                            key={genre}
                            variant={filters.genres?.includes(genre) ? 'default' : 'outline'}
                            className={cn(
                                "cursor-pointer transition-all hover:bg-primary/80 hover:text-primary-foreground",
                                filters.genres?.includes(genre)
                                    ? "bg-primary hover:bg-primary/90"
                                    : "bg-transparent border-white/10 hover:border-primary/50 text-muted-foreground"
                            )}
                            onClick={() => handleGenreToggle(genre)}
                        >
                            {genre}
                        </Badge>
                    ))}
                </div>
            </div>
        </div>
    );
};
