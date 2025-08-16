import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableGridHeaderProps {
  sortBy: 'date' | 'prompt' | 'status' | 'quality';
  sortOrder: 'asc' | 'desc';
  onSortChange: (column: 'date' | 'prompt' | 'status' | 'quality') => void;
  typeFilter: 'image' | 'video';
}

export const SortableGridHeader = ({
  sortBy,
  sortOrder,
  onSortChange,
  typeFilter
}: SortableGridHeaderProps) => {
  const getSortIcon = (column: string) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? 
      <ChevronUp className="h-3 w-3 ml-1" /> : 
      <ChevronDown className="h-3 w-3 ml-1" />;
  };

  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'prompt', label: typeFilter === 'image' ? 'Prompt' : 'Title' },
    { key: 'status', label: 'Status' },
    { key: 'quality', label: 'Quality' }
  ] as const;

  return (
    <div className="flex items-center justify-between p-3 bg-card/30 rounded-lg border border-border/30 mb-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Sort by:</span>
        <div className="flex gap-1">
          {columns.map(({ key, label }) => (
            <Button
              key={key}
              variant="ghost"
              size="sm"
              onClick={() => onSortChange(key)}
              className={cn(
                "h-8 px-3 text-xs transition-colors",
                sortBy === key 
                  ? "bg-primary/20 text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>{label}</span>
              {getSortIcon(key)}
            </Button>
          ))}
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground">
        {sortOrder === 'asc' ? 'Oldest first' : 'Newest first'}
      </div>
    </div>
  );
};