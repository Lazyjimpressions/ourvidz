import React from 'react';
import { Search, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CharacterHubFilters, CharacterGenre } from '@/types/character-hub-v2';
import { cn } from '@/lib/utils';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

export type CharacterSortOption = 'recent' | 'name' | 'most_used';

interface CharacterFiltersProps {
    filters: CharacterHubFilters;
    onFilterChange: (filters: CharacterHubFilters) => void;
    sort?: CharacterSortOption;
    onSortChange?: (sort: CharacterSortOption) => void;
    characterCount?: number;
    className?: string;
}

const GENRE_OPTIONS: CharacterGenre[] = [
    'Fantasy', 'Sci-Fi', 'Modern', 'Historical', 'Romance', 'Adventure', 'Other'
];

const SORT_OPTIONS: { value: CharacterSortOption; label: string }[] = [
    { value: 'recent', label: 'Recent' },
    { value: 'name', label: 'Name' },
    { value: 'most_used', label: 'Most Used' },
];

export const CharacterFilters: React.FC<CharacterFiltersProps> = ({
    filters,
    onFilterChange,
    sort = 'recent',
    onSortChange,
    characterCount,
    className
}) => {
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onFilterChange({ ...filters, search: e.target.value });
    };

    const handleGenreToggle = (genre: CharacterGenre) => {
        const currentGenres = filters.genres || [];
        const isSelected = currentGenres.includes(genre);
        const newGenres = isSelected
            ? currentGenres.filter(g => g !== genre)
            : [...currentGenres, genre];
        onFilterChange({ ...filters, genres: newGenres });
    };

    const handleClearFilters = () => {
        onFilterChange({
            search: filters.search,
            genres: [],
            contentRating: 'all',
            mediaReady: false
        });
    };

    const activeFilterCount = (filters.genres?.length || 0) + (filters.mediaReady ? 1 : 0);

    return (
        <div className={cn("flex items-center gap-2", className)}>
            {/* Search */}
            <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                <Input
                    type="text"
                    placeholder="Search characters..."
                    value={filters.search || ''}
                    onChange={handleSearchChange}
                    className="pl-8 h-8 text-xs bg-secondary/50 border-border/50 focus:border-primary/50"
                />
            </div>

            {/* Character count */}
            {characterCount !== undefined && (
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {characterCount}
                </span>
            )}

            {/* Sort */}
            {onSortChange && (
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[10px] border-border/50 bg-secondary/30 px-2.5">
                            <ArrowUpDown className="w-3 h-3" />
                            {SORT_OPTIONS.find(s => s.value === sort)?.label}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-32 p-1 bg-card border-border shadow-xl">
                        {SORT_OPTIONS.map(option => (
                            <button
                                key={option.value}
                                className={cn(
                                    "w-full text-left text-xs px-2.5 py-1.5 rounded-sm transition-colors",
                                    sort === option.value
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                                )}
                                onClick={() => onSortChange(option.value)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </PopoverContent>
                </Popover>
            )}

            {/* Filters popover */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[10px] border-border/50 bg-secondary/30 px-2.5">
                        <SlidersHorizontal className="w-3 h-3" />
                        Filters
                        {activeFilterCount > 0 && (
                            <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[9px] bg-primary/20 text-primary">
                                {activeFilterCount}
                            </Badge>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56 p-3 bg-card border-border shadow-xl">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium text-xs">Filters</h4>
                            {activeFilterCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 px-1.5 text-[9px] text-muted-foreground hover:text-foreground"
                                    onClick={handleClearFilters}
                                >
                                    Reset
                                </Button>
                            )}
                        </div>
                        <Separator className="bg-border/50" />

                        {/* Genres */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-muted-foreground font-medium">Genres</label>
                            <div className="flex flex-wrap gap-1">
                                {GENRE_OPTIONS.map(genre => (
                                    <Badge
                                        key={genre}
                                        variant={filters.genres?.includes(genre) ? 'default' : 'outline'}
                                        className={cn(
                                            "cursor-pointer text-[9px] h-5 transition-colors",
                                            filters.genres?.includes(genre)
                                                ? "bg-primary hover:bg-primary/90"
                                                : "bg-transparent border-border/50 text-muted-foreground hover:border-primary/50"
                                        )}
                                        onClick={() => handleGenreToggle(genre)}
                                    >
                                        {genre}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {/* Content Rating */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-muted-foreground font-medium">Content Rating</label>
                            <div className="flex rounded-md bg-secondary/50 p-0.5">
                                {(['all', 'sfw', 'nsfw'] as const).map(option => (
                                    <button
                                        key={option}
                                        className={cn(
                                            "flex-1 text-[10px] py-1 rounded-sm transition-colors",
                                            filters.contentRating === option
                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                        onClick={() => onFilterChange({ ...filters, contentRating: option })}
                                    >
                                        {option.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Media Ready */}
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="mediaReady"
                                checked={filters.mediaReady || false}
                                onChange={(e) => onFilterChange({ ...filters, mediaReady: e.target.checked })}
                                className="rounded border-border/50 bg-secondary/50 text-primary focus:ring-primary w-3 h-3"
                            />
                            <label htmlFor="mediaReady" className="text-[10px] cursor-pointer select-none text-muted-foreground">
                                Has Generated Media
                            </label>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
};
