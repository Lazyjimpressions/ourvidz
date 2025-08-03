import React, { useState } from 'react';
import { ContentCard } from './ContentCard';
import { WorkspaceItem } from '@/hooks/useSimplifiedWorkspaceState';

interface WorkspaceGridProps {
  items: WorkspaceItem[];
  onEdit: (item: WorkspaceItem) => void;
  onSave: (item: WorkspaceItem) => void;
  onDelete: (item: WorkspaceItem) => void;
  onView: (item: WorkspaceItem) => void;
  onDownload: (item: WorkspaceItem) => void;
  onUseAsReference: (item: WorkspaceItem) => void;
  onUseSeed: (item: WorkspaceItem) => void;
  isDeleting: Set<string>;
}

export const WorkspaceGrid: React.FC<WorkspaceGridProps> = ({
  items,
  onEdit,
  onSave,
  onDelete,
  onView,
  onDownload,
  onUseAsReference,
  onUseSeed,
  isDeleting
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="max-w-md">
          <h3 className="text-2xl font-semibold text-white mb-4">
            Let's start with some image storming.
          </h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Type your prompt, set your style, and generate your image. Your workspace will fill with creative content as you explore different ideas and variations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Grid Container - Minimal padding for maximum workspace real estate */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2 px-2">
        {items.map((item) => (
          <ContentCard
            key={item.id}
            item={item}
            onEdit={() => onEdit(item)}
            onSave={() => onSave(item)}
            onDelete={() => onDelete(item)}
            onView={() => onView(item)}
            onDownload={() => onDownload(item)}
            onUseAsReference={() => onUseAsReference(item)}
            onUseSeed={() => onUseSeed(item)}
            isDeleting={isDeleting.has(item.id)}
            size="md"
          />
        ))}
      </div>
    </div>
  );
}; 