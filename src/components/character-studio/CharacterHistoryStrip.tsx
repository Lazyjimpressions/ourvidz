import React, { useState, useEffect } from 'react';
import { CharacterScene } from '@/types/roleplay';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Loader2, Pin, User, Download, Trash2, Maximize2 } from 'lucide-react';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { supabase } from '@/integrations/supabase/client';

interface CharacterHistoryStripProps {
    history: CharacterScene[];
    isLoading: boolean;
    onPinAsAnchor: (url: string) => void;
    onUseAsMain: (url: string) => void;
    onDelete?: (id: string) => void; // Optional for now
}

// Helper to sign storage URLs
async function getSignedUrl(url: string): Promise<string> {
    if (!url) return '';
    // Already a full URL (http/https or data URI)
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }
    // Parse bucket and path from storage path like "workspace-temp/user_id/file.png" or "user-library/..."
    const knownBuckets = ['workspace-temp', 'user-library', 'characters', 'reference_images'];
    const parts = url.split('/');
    let bucket = 'workspace-temp';
    let path = url;

    if (knownBuckets.includes(parts[0])) {
        bucket = parts[0];
        path = parts.slice(1).join('/');
    }

    try {
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
        if (error) {
            console.error('Failed to sign URL:', error, { bucket, path });
            return url;
        }
        return data.signedUrl;
    } catch (err) {
        console.error('Error signing URL:', err);
        return url;
    }
}

export const CharacterHistoryStrip: React.FC<CharacterHistoryStripProps> = ({
    history,
    isLoading,
    onPinAsAnchor,
    onUseAsMain,
    onDelete
}) => {
    // State to hold signed URLs keyed by scene ID
    const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

    // Sign URLs when history changes
    useEffect(() => {
        const signUrls = async () => {
            const newSignedUrls: Record<string, string> = {};
            for (const scene of history) {
                if (scene.image_url && !signedUrls[scene.id]) {
                    newSignedUrls[scene.id] = await getSignedUrl(scene.image_url);
                } else if (signedUrls[scene.id]) {
                    newSignedUrls[scene.id] = signedUrls[scene.id];
                }
            }
            setSignedUrls(newSignedUrls);
        };
        if (history.length > 0) {
            signUrls();
        }
    }, [history]);

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
                                        {scene.image_url && signedUrls[scene.id] ? (
                                            <img
                                                src={signedUrls[scene.id]}
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
                                    {scene.image_url && signedUrls[scene.id] && (
                                        <div className="relative w-full h-full max-h-[85vh] flex items-center justify-center bg-black/50">
                                            <img
                                                src={signedUrls[scene.id]}
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
                            <ContextMenuItem onClick={() => signedUrls[scene.id] && window.open(signedUrls[scene.id], '_blank')}>
                                <Download className="w-4 h-4 mr-2" /> Download
                            </ContextMenuItem>
                            {onDelete && (
                                <ContextMenuItem
                                    onClick={() => onDelete(scene.id)}
                                    className="text-destructive focus:text-destructive"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                                </ContextMenuItem>
                            )}
                        </ContextMenuContent>
                    </ContextMenu>
                ))}
            </div>
            <ScrollBar orientation="vertical" />
        </ScrollArea>
    );
};
