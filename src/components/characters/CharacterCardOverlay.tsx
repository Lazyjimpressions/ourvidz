import React from 'react';
import {
    Eye,
    MessageCircle,
    Pencil,
    Sparkles,
    Copy,
    Trash,
    Video,
    Download,
    Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CharacterCardContext } from './CharacterCard';

interface CharacterCardOverlayProps {
    isOpen: boolean;
    context: CharacterCardContext;
    onPreview?: () => void;
    onChat?: () => void;
    onEdit?: () => void;
    onGenerate?: (e: React.MouseEvent) => void;
    onDuplicate?: () => void;
    onDelete?: () => void;
    onDownload?: () => void;
    onShare?: () => void;
    isOwner?: boolean;
}

export const CharacterCardOverlay: React.FC<CharacterCardOverlayProps> = ({
    isOpen,
    context,
    onPreview,
    onChat,
    onEdit,
    onGenerate,
    onDuplicate,
    onDelete,
    onDownload,
    onShare,
    isOwner
}) => {
    if (!isOpen) return null;

    // Render Roleplay Actions
    if (context === 'roleplay') {
        return (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 animate-in fade-in duration-200">
                <Button
                    variant="secondary"
                    size="sm"
                    className="w-32 gap-2 bg-white/10 hover:bg-white/20 text-white border-white/10"
                    onClick={(e) => { e.stopPropagation(); onPreview?.(); }}
                >
                    <Eye className="w-4 h-4" /> Preview
                </Button>
                <Button
                    variant="default"
                    size="sm"
                    className="w-32 gap-2 bg-primary hover:bg-primary/90"
                    onClick={(e) => { e.stopPropagation(); onChat?.(); }}
                >
                    <MessageCircle className="w-4 h-4" /> Chat
                </Button>
                {isOwner && onEdit && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 text-white/50 hover:text-white hover:bg-white/10"
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    >
                        <Pencil className="w-4 h-4" />
                    </Button>
                )}
            </div>
        );
    }

    // Render Hub Actions
    if (context === 'hub') {
        return (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex flex-col items-end justify-start p-3 animate-in fade-in duration-200 pointer-events-none">
                <div className="flex flex-col gap-2 pointer-events-auto">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/10 shadow-sm backdrop-blur-md"
                        onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
                        title="Edit Character"
                    >
                        <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/10 shadow-sm backdrop-blur-md"
                        onClick={(e) => { e.stopPropagation(); onDuplicate?.(); }}
                        title="Duplicate"
                    >
                        <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-black/40 hover:bg-red-900/60 text-red-200 hover:text-red-100 border border-white/10 shadow-sm backdrop-blur-md"
                        onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                        title="Delete"
                    >
                        <Trash className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        );
    }

    // Render Library Actions
    return (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center gap-2 animate-in fade-in duration-200">
            <Button
                variant="secondary"
                size="icon"
                className="rounded-full bg-white/10 hover:bg-white/20 text-white border-white/10"
                onClick={(e) => { e.stopPropagation(); onDownload?.(); }}
            >
                <Download className="w-4 h-4" />
            </Button>
            <Button
                variant="secondary"
                size="icon"
                className="rounded-full bg-white/10 hover:bg-white/20 text-white border-white/10"
                onClick={(e) => { e.stopPropagation(); onShare?.(); }}
            >
                <Share2 className="w-4 h-4" />
            </Button>
        </div>
    );
};
