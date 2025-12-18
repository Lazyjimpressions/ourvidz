import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreVertical, 
  RefreshCw, 
  Edit, 
  Copy, 
  Trash2,
  Download,
  Share2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { cn } from '@/lib/utils';

interface MessageActionsProps {
  message: {
    id: string;
    content: string;
    sender: 'user' | 'character';
    metadata?: {
      image_url?: string;
      scene_generated?: boolean;
    };
  };
  onRegenerate?: () => void;
  onEdit?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  showOnHover?: boolean;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  message,
  onRegenerate,
  onEdit,
  onCopy,
  onDelete,
  onDownload,
  onShare,
  showOnHover = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { isMobile } = useMobileDetection();

  const handleCopy = () => {
    if (onCopy) {
      onCopy();
    } else {
      navigator.clipboard.writeText(message.content);
      toast({
        title: 'Copied!',
        description: 'Message copied to clipboard',
      });
    }
    setIsOpen(false);
  };

  const handleRegenerate = () => {
    if (onRegenerate) {
      onRegenerate();
    }
    setIsOpen(false);
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    }
    setIsOpen(false);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    }
    setIsOpen(false);
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else if (message.metadata?.image_url) {
      const link = document.createElement('a');
      link.href = message.metadata.image_url;
      link.download = `scene-${message.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        title: 'Downloaded!',
        description: 'Scene image downloaded',
      });
    }
    setIsOpen(false);
  };

  const handleShare = () => {
    if (onShare) {
      onShare();
    } else if (message.metadata?.image_url) {
      navigator.clipboard.writeText(message.metadata.image_url);
      toast({
        title: 'Shared!',
        description: 'Scene URL copied to clipboard',
      });
    }
    setIsOpen(false);
  };

  // Only show actions for character messages (regenerate) or user messages (edit/delete)
  const hasActions = 
    (message.sender === 'character' && onRegenerate) ||
    (message.sender === 'user' && (onEdit || onDelete)) ||
    onCopy ||
    (message.metadata?.image_url && (onDownload || onShare));

  if (!hasActions) {
    return null;
  }

  return (
    <div className={`
      ${showOnHover && !isMobile ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}
      transition-opacity duration-200
      ${message.sender === 'user' ? 'ml-auto' : ''}
    `}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "p-0",
              isMobile ? "min-w-[44px] min-h-[44px] w-11 h-11" : "h-7 w-7",
              message.sender === 'user' 
                ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/20' 
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
            )}
          >
            <MoreVertical className={cn(isMobile ? "w-5 h-5" : "w-4 h-4")} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align={message.sender === 'user' ? 'end' : 'start'}
          className="bg-gray-800 border-gray-700 min-w-[160px]"
        >
          {message.sender === 'character' && onRegenerate && (
            <DropdownMenuItem
              onClick={handleRegenerate}
              className="text-white hover:bg-gray-700 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate
            </DropdownMenuItem>
          )}
          
          {message.sender === 'user' && onEdit && (
            <DropdownMenuItem
              onClick={handleEdit}
              className="text-white hover:bg-gray-700 cursor-pointer"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
          )}
          
          {onCopy && (
            <DropdownMenuItem
              onClick={handleCopy}
              className="text-white hover:bg-gray-700 cursor-pointer"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </DropdownMenuItem>
          )}
          
          {message.metadata?.image_url && onDownload && (
            <DropdownMenuItem
              onClick={handleDownload}
              className="text-white hover:bg-gray-700 cursor-pointer"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Image
            </DropdownMenuItem>
          )}
          
          {message.metadata?.image_url && onShare && (
            <DropdownMenuItem
              onClick={handleShare}
              className="text-white hover:bg-gray-700 cursor-pointer"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Image
            </DropdownMenuItem>
          )}
          
          {message.sender === 'user' && onDelete && (
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-red-400 hover:bg-red-500/20 cursor-pointer"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

