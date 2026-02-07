import React from 'react';
import { CharacterScene } from '@/types/roleplay';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Loader2, Pin, User, Download, Trash2, Maximize2 } from 'lucide-react';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { AspectRatio } from '@/components/ui/aspect-ratio';

interface CharacterHistoryStripProps {
    history: CharacterScene[];
    isLoading: boolean;
    onPinAsAnchor: (url: string) => void;
    onUseAsMain: (url: string) => void;
    onDelete?: (id: string) => void; // Optional for now
}

export const CharacterHistoryStrip: React.FC<CharacterHistoryStripProps> = ({
    history,
    isLoading,
    onPinAsAnchor,
    onUseAsMain,
    onDelete
}) => {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-black/20 rounded-lg border border-dashed border-white/5 mx-2 my-2">
                <p className="text-sm text-muted-foreground mb-1">No history yet</p>
                <p className="text-xs text-muted-foreground/50">Generated images will appear here</p>
            </div>
        );
    }

    return (
        <ScrollArea className="flex-1 w-full">
            <div className="grid grid-cols-2 gap-2 p-2">
                {history.map((scene) => (
                    <ContextMenu key={scene.id}>
                        <ContextMenuTrigger>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <div className="group relative aspect-[3/4] bg-secondary/20 rounded-md overflow-hidden border border-white/5 hover:border-primary/50 transition-all cursor-zoom-in">
                                        {scene.image_url ? (
                                            <img
                                                src={scene.image_url}
                                                alt={scene.scene_prompt || "Generated Image"}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-muted/20">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            </div>
                                        )}

                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-6 w-6 text-white hover:text-primary hover:bg-white/10"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (scene.image_url) onPinAsAnchor(scene.image_url);
                                                    }}
                                                    title="Pin as Anchor"
                                                >
                                                    <Pin className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl bg-black/90 border-white/10 p-0 overflow-hidden">
                                    {scene.image_url && (
                                        <div className="relative w-full h-full max-h-[85vh] flex items-center justify-center bg-black/50">
                                            <img
                                                src={scene.image_url}
                                                alt={scene.scene_prompt}
                                                className="max-w-full max-h-full object-contain"
                                            />
                                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/60 backdrop-blur-md flex justify-between items-center">
                                                <p className="text-sm text-white/80 line-clamp-1 max-w-[60%]">
                                                    {scene.scene_prompt}
                                                </p>
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="secondary" onClick={() => onPinAsAnchor(scene.image_url!)}>
                                                        <Pin className="w-3 h-3 mr-2" /> Pin
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </DialogContent>
                            </Dialog>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-48">
                            <ContextMenuItem onClick={() => scene.image_url && onPinAsAnchor(scene.image_url)}>
                                <Pin className="w-4 h-4 mr-2" /> Pin as Anchor
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => scene.image_url && onUseAsMain(scene.image_url)}>
                                <User className="w-4 h-4 mr-2" /> Set as Profile
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => scene.image_url && window.open(scene.image_url, '_blank')}>
                                <Download className="w-4 h-4 mr-2" /> Download
                            </ContextMenuItem>
                            {/* <ContextMenuItem className="text-destructive focus:text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </ContextMenuItem> */}
                        </ContextMenuContent>
                    </ContextMenu>
                ))}
            </div>
            <ScrollBar orientation="vertical" />
        </ScrollArea>
    );
};
