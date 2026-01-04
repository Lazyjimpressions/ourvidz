import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  MoreVertical,
  Trash2,
  Download,
  Share2,
  Copy,
  Settings,
  Image as ImageIcon,
  FileText,
  Flag,
  Edit,
  Sparkles
} from 'lucide-react';
import { useMobileDetection } from '@/hooks/useMobileDetection';

interface ContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onClearConversation: () => void;
  onExportConversation: () => void;
  onShareConversation: () => void;
  onViewScenes: () => void;
  onSaveToLibrary: () => void;
  onEditCharacter?: () => void;
  onReportCharacter: () => void;
  onNewScenario?: () => void;
  canEditCharacter?: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  onClose,
  onClearConversation,
  onExportConversation,
  onShareConversation,
  onViewScenes,
  onSaveToLibrary,
  onEditCharacter,
  onReportCharacter,
  onNewScenario,
  canEditCharacter = false
}) => {
  const { isMobile } = useMobileDetection();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const menuItems = [
    ...(onNewScenario ? [{
      icon: Sparkles,
      label: 'New Scenario',
      onClick: onNewScenario,
      variant: 'default' as const
    }] : []),
    {
      icon: Trash2,
      label: 'Clear Conversation',
      onClick: onClearConversation,
      variant: 'destructive' as const
    },
    {
      icon: Download,
      label: 'Export Conversation',
      onClick: onExportConversation,
      variant: 'default' as const
    },
    {
      icon: Share2,
      label: 'Share Conversation',
      onClick: onShareConversation,
      variant: 'default' as const
    },
    {
      icon: ImageIcon,
      label: 'View Generated Scenes',
      onClick: onViewScenes,
      variant: 'default' as const
    },
    {
      icon: FileText,
      label: 'Save to Library',
      onClick: onSaveToLibrary,
      variant: 'default' as const
    },
    ...(canEditCharacter && onEditCharacter ? [{
      icon: Edit,
      label: 'Edit Character',
      onClick: onEditCharacter,
      variant: 'default' as const
    }] : []),
    {
      icon: Flag,
      label: 'Report Character',
      onClick: onReportCharacter,
      variant: 'destructive' as const
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
      />
      
      {/* Menu */}
      <div 
        ref={menuRef}
        className="relative mt-16 mr-4"
      >
        <Card className="bg-gray-900 border-gray-700 shadow-xl min-w-[200px]">
          <div className="p-1">
            {menuItems.map((item, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                onClick={() => {
                  item.onClick();
                  onClose();
                }}
                className={`
                  w-full justify-start gap-3 px-3 py-2 text-sm
                  ${item.variant === 'destructive' 
                    ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }
                `}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
