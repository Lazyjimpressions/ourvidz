
import React from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Image, Trash2 } from "lucide-react";

interface ReferenceHistoryItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  timestamp: Date;
  prompt?: string;
  strength?: number;
  type?: 'character' | 'style' | 'composition';
  analysis?: any;
}

interface ReferenceHistoryPanelProps {
  history: ReferenceHistoryItem[];
  onSelectReference: (item: ReferenceHistoryItem) => void;
  onClearHistory: () => void;
  className?: string;
}

export const ReferenceHistoryPanel = ({
  history,
  onSelectReference,
  onClearHistory,
  className = ""
}: ReferenceHistoryPanelProps) => {
  if (history.length === 0) return null;

  return (
    <div className={`bg-gray-900/50 rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <h4 className="text-sm font-medium text-white">Recent References</h4>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearHistory}
          className="text-gray-400 hover:text-white h-6 px-2"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>

      <ScrollArea className="h-32">
        <div className="grid grid-cols-4 gap-2">
          {history.slice(0, 8).map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectReference(item)}
              className="relative group aspect-square bg-gray-800 rounded overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all"
              title={`${item.type || 'Reference'} - ${item.strength ? `${Math.round(item.strength * 100)}%` : 'Unknown strength'}`}
            >
              <img
                src={item.url}
                alt="Reference history"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.type || 'Ref'}
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
