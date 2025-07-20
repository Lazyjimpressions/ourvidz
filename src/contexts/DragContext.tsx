
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DragContextType {
  isDragging: boolean;
  draggedAsset: any | null;
  setDragging: (isDragging: boolean, asset?: any) => void;
}

const DragContext = createContext<DragContextType | undefined>(undefined);

export const DragProvider = ({ children }: { children: ReactNode }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedAsset, setDraggedAsset] = useState<any | null>(null);

  const setDragging = (dragging: boolean, asset?: any) => {
    setIsDragging(dragging);
    setDraggedAsset(dragging ? asset : null);
  };

  return (
    <DragContext.Provider value={{ isDragging, draggedAsset, setDragging }}>
      {children}
    </DragContext.Provider>
  );
};

export const useDrag = () => {
  const context = useContext(DragContext);
  if (context === undefined) {
    throw new Error('useDrag must be used within a DragProvider');
  }
  return context;
};
