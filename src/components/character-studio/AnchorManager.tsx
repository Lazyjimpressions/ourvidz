import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, Star, Loader2, Image as ImageIcon } from 'lucide-react';
import { CharacterAnchor } from '@/types/character-hub-v2';
import { cn } from '@/lib/utils';

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
    const [dragActive, setDragActive] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            await onUpload(e.target.files[0]);
        }
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
                        <img
                            src={anchor.image_url}
                            alt="Anchor"
                            className="w-full h-full object-cover"
                        />

                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                            <div className="flex justify-end">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-white hover:text-red-400 hover:bg-white/10"
                                    onClick={() => onDelete(anchor.id)}
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
