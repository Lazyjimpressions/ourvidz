
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ArrowUp, ArrowDown, Calendar, Type } from "lucide-react";

export type SortOption = "newest" | "oldest" | "name";

interface SortDropdownProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export const SortDropdown = ({ sortBy, onSortChange }: SortDropdownProps) => {
  const sortOptions = [
    {
      value: "newest" as SortOption,
      label: "Newest First",
      icon: <ArrowDown className="h-4 w-4" />,
      description: "Most recent assets first"
    },
    {
      value: "oldest" as SortOption,
      label: "Oldest First", 
      icon: <ArrowUp className="h-4 w-4" />,
      description: "Oldest assets first"
    },
    {
      value: "name" as SortOption,
      label: "Name",
      icon: <Type className="h-4 w-4" />,
      description: "Sort alphabetically"
    }
  ];

  const currentSort = sortOptions.find(option => option.value === sortBy);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
        >
          <div className="flex items-center gap-2">
            {currentSort?.icon}
            <span>Sort: {currentSort?.label}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-56 bg-gray-800 border-gray-700 text-gray-300"
      >
        {sortOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onSortChange(option.value)}
            className={`cursor-pointer hover:bg-gray-700 focus:bg-gray-700 ${
              sortBy === option.value ? 'bg-gray-700 text-white' : ''
            }`}
          >
            <div className="flex items-center gap-3 w-full">
              {option.icon}
              <div className="flex flex-col gap-1">
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-gray-500">{option.description}</span>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
