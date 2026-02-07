import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, Star, Loader2, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { CharacterAnchor } from '@/types/character-hub-v2';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

// Helper to get display URL (sign if needed)
async function getDisplayUrl(url: string): Promise<string> {
    if (!url) return '';
    // Already a full URL (http/https or data URI)
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }
    // Parse bucket and path from storage path
    const knownBuckets = ['workspace-temp', 'user-library', 'characters', 'reference_images'];
    const parts = url.split('/');
    let bucket = 'characters';
    let path = url;

    if (knownBuckets.includes(parts[0])) {
        bucket = parts[0];
        path = parts.slice(1).join('/');
    }

    try {
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
        if (error) {
            console.error('Failed to sign anchor URL:', error);
            return url;
        }
        return data.signedUrl;
    } catch (err) {
        console.error('Error signing anchor URL:', err);
        return url;
    }
}

interface AnchorManagerProps {
    anchors: CharacterAnchor[];
    onUpload: (file: File) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onSetPrimary: (id: string) => Promise<void>;
    isUploading?: boolean;
}

export const AnchorManager: React.FC<AnchorManagerProps> = ({
    anchors,
    onUpload,
    onDelete,
    onSetPrimary,
    isUploading = false
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const replaceInputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);
    const [displayUrls, setDisplayUrls] = useState<Record<string, string>>({});
    const [replacingAnchorId, setReplacingAnchorId] = useState<string | null>(null);

    // Sign URLs when anchors change
    useEffect(() => {
        const signUrls = async () => {
            const newUrls: Record<string, string> = {};
            for (const anchor of anchors) {
                if (anchor.image_url) {
                    newUrls[anchor.id] = await getDisplayUrl(anchor.image_url);
                }
            }
            setDisplayUrls(newUrls);
        };
        if (anchors.length > 0) {
            signUrls();
        } else {
            setDisplayUrls({});
        }
    }, [anchors]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            await onUpload(e.target.files[0]);
        }
    };

    const handleReplaceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && replacingAnchorId) {
            // Delete the old anchor first, then upload new one
            await onDelete(replacingAnchorId);
            await onUpload(e.target.files[0]);
            setReplacingAnchorId(null);
        }
        // Reset the input
        if (replaceInputRef.current) {
            replaceInputRef.current.value = '';
        }
    };

    const handleReplaceClick = (anchorId: string) => {
        setReplacingAnchorId(anchorId);
        replaceInputRef.current?.click();
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            await onUpload(e.dataTransfer.files[0]);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Anchor Images</Label>
                <span className="text-xs text-muted-foreground">{anchors.length} images</span>
            </div>

            {/* Grid of Anchors */}
            <div className="grid grid-cols-3 gap-3">
                {anchors.map((anchor) => (
                    <div
                        key={anchor.id}
                        className={cn(
                            "group relative aspect-square rounded-lg overflow-hidden border transition-all",
                            anchor.is_primary ? "border-primary ring-2 ring-primary/20" : "border-white/10 hover:border-white/30"
                        )}
                    >
                        {displayUrls[anchor.id] ? (
                            <img
                                src={displayUrls[anchor.id]}
                                alt="Anchor"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted/20">
                                <Loader2 className="w-4 h-4 animate-spin" />
                            </div>
                        )}

                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                            <div className="flex justify-between">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-white hover:text-primary hover:bg-white/10"
                                    onClick={() => handleReplaceClick(anchor.id)}
                                    title="Replace this anchor"
                                >
                                    <RefreshCw className="w-3 h-3" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-white hover:text-red-400 hover:bg-white/10"
                                    onClick={() => onDelete(anchor.id)}
                                    title="Delete this anchor"
                                >
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>

                            <div className="flex justify-center">
                                {anchor.is_primary ? (
                                    <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                        <Star className="w-2 h-2 fill-current" /> Primary
                                    </span>
                                ) : (
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="h-6 text-[10px] bg-white/20 hover:bg-white/30 text-white border-0"
                                        onClick={() => onSetPrimary(anchor.id)}
                                    >
                                        Set Primary
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Upload Button */}
                <div
                    className={cn(
                        "relative aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-secondary/5 hover:bg-secondary/10",
                        dragActive && "border-primary bg-primary/5",
                        isUploading && "pointer-events-none opacity-50"
                    )}
                    onClick={() => fileInputRef.current?.click()}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    <input
                        ref={replaceInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleReplaceFileChange}
                    />

                    {isUploading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    ) : (
                        <>
                            <Upload className="w-6 h-6 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground text-center px-2">
                                Upload or Drop
                            </span>
                        </>
                    )}
                </div>
            </div>

            <p className="text-xs text-muted-foreground">
                Upload 3-5 images for best consistency. The primary image is used as the main thumbnail.
            </p>
        </div>
    );
};
