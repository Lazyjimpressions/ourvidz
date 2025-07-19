
import React from 'react';
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface MediaTile {
  id: string;
  originalAssetId: string;
  type: 'image' | 'video';
  url?: string;
  prompt: string;
  timestamp: Date;
  quality: 'fast' | 'high';
  modelType?: string;
  duration?: number;
  thumbnailUrl?: string;
}

interface SimpleWorkspaceGridProps {
  mediaTiles: MediaTile[];
  onRemoveTile: (tileId: string) => void;
}

export const SimpleWorkspaceGrid = ({ mediaTiles, onRemoveTile }: SimpleWorkspaceGridProps) => {
  if (mediaTiles.length === 0) {
    return (
      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">
          Workspace is empty. Generated images and videos will automatically appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {mediaTiles.map((tile) => (
        <div key={tile.id} className="relative group">
          {tile.type === 'video' ? (
            <video
              src={tile.url}
              className="w-full aspect-square object-cover rounded-lg border border-border cursor-pointer hover:scale-105 transition"
              muted
              loop
              onMouseEnter={(e) => e.currentTarget.play()}
              onMouseLeave={(e) => e.currentTarget.pause()}
            />
          ) : (
            <img
              src={tile.url}
              alt={`Generated ${tile.type}`}
              className="w-full aspect-square object-cover rounded-lg border border-border hover:scale-105 transition cursor-pointer"
            />
          )}
          <button
            onClick={() => onRemoveTile(tile.id)}
            className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
};
