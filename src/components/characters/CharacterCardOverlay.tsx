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
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col p-4 animate-in fade-in duration-200">
                <div className="flex-1 flex flex-col justify-center gap-2">
                    <Button
                        variant="default"
                        size="sm"
                        className="w-full justify-start gap-2 bg-primary/90 hover:bg-primary"
                        onClick={(e) => { e.stopPropagation(); onGenerate?.(e); }}
                    >
                        <Sparkles className="w-4 h-4" /> Generate Image
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        className="w-full justify-start gap-2 bg-white/10 hover:bg-white/20 text-white border-white/10"
                        onClick={(e) => { e.stopPropagation(); console.log('Video gen not implemented'); }}
                    >
                        <Video className="w-4 h-4" /> Generate Video
                    </Button>
                </div>

                <div className="pt-2 border-t border-white/10 flex flex-col gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2 text-white/70 hover:text-white hover:bg-white/10 h-8"
                        onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
                    >
                        <Pencil className="w-3.5 h-3.5" /> Edit Character
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2 text-white/70 hover:text-white hover:bg-white/10 h-8"
                        onClick={(e) => { e.stopPropagation(); onDuplicate?.(); }}
                    >
                        <Copy className="w-3.5 h-3.5" /> Duplicate
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 h-8"
                        onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                    >
                        <Trash className="w-3.5 h-3.5" /> Delete
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
