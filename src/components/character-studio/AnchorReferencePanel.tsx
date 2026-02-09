/**
 * AnchorReferencePanel Component
 *
 * Column C component for selecting anchor references (Face/Body/Style) for i2i generation.
 * These are session-based inputs, not persisted to the database.
 *
 * Sources:
 * - Upload File: Local file upload
 * - From Library: Pick from user_library
 * - From References: Pick from character_anchors (saved reference images)
 * - From Canon: Pick from character_portraits (this character's canon images)
 */

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
    User,
    Shirt,
    Palette,
    Upload,
    Library,
    Image as ImageIcon,
    Star,
    X,
    ChevronDown,
    Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImagePickerDialog } from '@/components/storyboard/ImagePickerDialog';

// Anchor slot types
export type AnchorSlotType = 'face' | 'body' | 'style';

// Anchor reference sources
export type AnchorSource = 'file' | 'library' | 'references' | 'canon';

// Anchor reference data
export interface AnchorReference {
    imageUrl: string;
    signedUrl?: string;
    source: AnchorSource;
    sourceId?: string; // ID of library item, reference, or portrait
    sourceName?: string; // Display name for the source
}

// Slot configuration
interface SlotConfig {
    type: AnchorSlotType;
    label: string;
    icon: React.ElementType;
    description: string;
}

const ANCHOR_SLOTS: SlotConfig[] = [
    {
        type: 'face',
        label: 'Face',
        icon: User,
        description: 'Face/portrait reference for identity',
    },
    {
        type: 'body',
        label: 'Body',
        icon: Shirt,
        description: 'Full body reference for proportions',
    },
    {
        type: 'style',
        label: 'Style',
        icon: Palette,
        description: 'Style reference for artistic look',
    },
];

interface AnchorReferencePanelProps {
    /** Current anchor references (session state) */
    anchors: {
        face: AnchorReference | null;
        body: AnchorReference | null;
        style: AnchorReference | null;
    };
    /** Callback when an anchor is updated */
    onAnchorChange: (slot: AnchorSlotType, anchor: AnchorReference | null) => void;
    /** Character portraits for "From Canon" option */
    canonPortraits?: { id: string; image_url: string; signedUrl?: string; is_primary?: boolean }[];
    /** Saved reference images for "From References" option */
    savedReferences?: { id: string; image_url: string; signedUrl?: string; anchor_type?: string; name?: string }[];
    /** Whether the panel is disabled */
    disabled?: boolean;
    /** Compact mode for smaller displays */
    compact?: boolean;
}

export const AnchorReferencePanel: React.FC<AnchorReferencePanelProps> = ({
    anchors,
    onAnchorChange,
    canonPortraits = [],
    savedReferences = [],
    disabled = false,
    compact = false,
}) => {
    // File input refs for each slot
    const fileInputRefs = {
        face: useRef<HTMLInputElement>(null),
        body: useRef<HTMLInputElement>(null),
        style: useRef<HTMLInputElement>(null),
    };

    // Library picker state
    const [libraryPickerOpen, setLibraryPickerOpen] = useState(false);
    const [activeSlot, setActiveSlot] = useState<AnchorSlotType | null>(null);

    // Handle file upload
    const handleFileUpload = useCallback(
        async (slot: AnchorSlotType, file: File) => {
            // Create a local URL for the file
            const localUrl = URL.createObjectURL(file);
            onAnchorChange(slot, {
                imageUrl: localUrl,
                signedUrl: localUrl, // Local URLs don't need signing
                source: 'file',
                sourceName: file.name,
            });
        },
        [onAnchorChange]
    );

    // Handle file input change
    const handleFileInputChange = (slot: AnchorSlotType) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileUpload(slot, file);
        }
        // Reset the input so the same file can be selected again
        e.target.value = '';
    };

    // Open library picker for a slot
    const openLibraryPicker = (slot: AnchorSlotType) => {
        setActiveSlot(slot);
        setLibraryPickerOpen(true);
    };

    // Handle library selection
    const handleLibrarySelect = (imageUrl: string, source: 'library' | 'workspace') => {
        if (activeSlot) {
            onAnchorChange(activeSlot, {
                imageUrl,
                signedUrl: imageUrl, // Library picker returns signed URLs
                source: 'library',
                sourceName: 'Library',
            });
        }
        setLibraryPickerOpen(false);
        setActiveSlot(null);
    };

    // Handle canon portrait selection
    const handleCanonSelect = (slot: AnchorSlotType, portrait: { id: string; image_url: string; signedUrl?: string }) => {
        onAnchorChange(slot, {
            imageUrl: portrait.image_url,
            signedUrl: portrait.signedUrl || portrait.image_url,
            source: 'canon',
            sourceId: portrait.id,
            sourceName: 'Canon',
        });
    };

    // Handle saved reference selection
    const handleReferenceSelect = (slot: AnchorSlotType, ref: { id: string; image_url: string; signedUrl?: string; name?: string }) => {
        onAnchorChange(slot, {
            imageUrl: ref.image_url,
            signedUrl: ref.signedUrl || ref.image_url,
            source: 'references',
            sourceId: ref.id,
            sourceName: ref.name || 'Reference',
        });
    };

    // Clear an anchor slot
    const clearAnchor = (slot: AnchorSlotType) => {
        onAnchorChange(slot, null);
    };

    // Count filled slots
    const filledCount = Object.values(anchors).filter(Boolean).length;

    return (
        <div className={cn('space-y-3', compact && 'space-y-2')}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <Label className={cn('font-medium', compact ? 'text-xs' : 'text-sm')}>
                    Reference Anchors
                </Label>
                <span className="text-[10px] text-muted-foreground">
                    {filledCount}/3 set
                </span>
            </div>

            {/* Slot Grid */}
            <div className={cn('grid gap-2', compact ? 'grid-cols-3' : 'grid-cols-1')}>
                {ANCHOR_SLOTS.map((slot) => {
                    const SlotIcon = slot.icon;
                    const anchor = anchors[slot.type];
                    const hasAnchor = !!anchor;

                    return (
                        <div key={slot.type} className="space-y-1">
                            {/* Slot Label */}
                            {!compact && (
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                    <SlotIcon className="w-3 h-3" />
                                    <span>{slot.label}</span>
                                </div>
                            )}

                            {/* Slot Content */}
                            {hasAnchor ? (
                                /* Filled Slot */
                                <div
                                    className={cn(
                                        'relative group rounded-lg border overflow-hidden',
                                        compact ? 'aspect-square' : 'h-16 flex items-center gap-3 p-2',
                                        'bg-secondary/30 border-white/10 hover:border-white/20 transition-colors'
                                    )}
                                >
                                    {/* Thumbnail */}
                                    <img
                                        src={anchor.signedUrl || anchor.imageUrl}
                                        alt={`${slot.label} reference`}
                                        className={cn(
                                            'object-cover',
                                            compact ? 'w-full h-full' : 'w-12 h-12 rounded'
                                        )}
                                    />

                                    {/* Info (non-compact) */}
                                    {!compact && (
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium truncate flex items-center gap-1">
                                                <SlotIcon className="w-3 h-3 text-muted-foreground" />
                                                {slot.label}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground truncate">
                                                {anchor.sourceName || anchor.source}
                                            </p>
                                        </div>
                                    )}

                                    {/* Clear Button (hover overlay) */}
                                    <button
                                        onClick={() => clearAnchor(slot.type)}
                                        disabled={disabled}
                                        className={cn(
                                            'absolute flex items-center justify-center bg-black/50 text-white transition-opacity',
                                            compact
                                                ? 'inset-0 opacity-0 group-hover:opacity-100'
                                                : 'top-1 right-1 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100'
                                        )}
                                        title="Clear reference"
                                    >
                                        <X className={cn(compact ? 'w-5 h-5' : 'w-3 h-3')} />
                                    </button>

                                    {/* Compact label overlay */}
                                    {compact && (
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                                            <span className="text-[9px] text-white font-medium flex items-center gap-0.5">
                                                <SlotIcon className="w-2.5 h-2.5" />
                                                {slot.label}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Empty Slot - Dropdown Trigger */
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild disabled={disabled}>
                                        <button
                                            className={cn(
                                                'w-full rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors',
                                                compact ? 'aspect-square' : 'h-16',
                                                'border-muted-foreground/30 hover:border-primary/50 hover:bg-secondary/20',
                                                disabled && 'opacity-50 cursor-not-allowed'
                                            )}
                                        >
                                            <SlotIcon className={cn('text-muted-foreground/50', compact ? 'w-4 h-4' : 'w-5 h-5')} />
                                            {compact ? (
                                                <span className="text-[8px] text-muted-foreground/70">{slot.label}</span>
                                            ) : (
                                                <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                                                    Add {slot.label} <ChevronDown className="w-3 h-3" />
                                                </span>
                                            )}
                                        </button>
                                    </DropdownMenuTrigger>

                                    <DropdownMenuContent align="start" className="w-48">
                                        <DropdownMenuLabel className="text-xs">Select {slot.label} Reference</DropdownMenuLabel>
                                        <DropdownMenuSeparator />

                                        {/* Upload File */}
                                        <DropdownMenuItem
                                            onClick={() => fileInputRefs[slot.type].current?.click()}
                                            className="gap-2"
                                        >
                                            <Upload className="w-4 h-4" />
                                            Upload File
                                        </DropdownMenuItem>

                                        {/* From Library */}
                                        <DropdownMenuItem
                                            onClick={() => openLibraryPicker(slot.type)}
                                            className="gap-2"
                                        >
                                            <Library className="w-4 h-4" />
                                            From Library
                                        </DropdownMenuItem>

                                        {/* From Canon (if available) */}
                                        {canonPortraits.length > 0 && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuLabel className="text-[10px] text-muted-foreground">
                                                    From Canon ({canonPortraits.length})
                                                </DropdownMenuLabel>
                                                {canonPortraits.slice(0, 4).map((portrait) => (
                                                    <DropdownMenuItem
                                                        key={portrait.id}
                                                        onClick={() => handleCanonSelect(slot.type, portrait)}
                                                        className="gap-2"
                                                    >
                                                        <div className="w-6 h-6 rounded overflow-hidden border border-white/10">
                                                            <img
                                                                src={portrait.signedUrl || portrait.image_url}
                                                                alt="Canon"
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                        <span className="flex-1 truncate text-xs">
                                                            {portrait.is_primary ? 'Primary' : 'Canon'}
                                                        </span>
                                                        {portrait.is_primary && (
                                                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                                        )}
                                                    </DropdownMenuItem>
                                                ))}
                                            </>
                                        )}

                                        {/* From References (if available) */}
                                        {savedReferences.length > 0 && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuLabel className="text-[10px] text-muted-foreground">
                                                    Saved References ({savedReferences.length})
                                                </DropdownMenuLabel>
                                                {savedReferences
                                                    .filter((ref) => !ref.anchor_type || ref.anchor_type === slot.type)
                                                    .slice(0, 4)
                                                    .map((ref) => (
                                                        <DropdownMenuItem
                                                            key={ref.id}
                                                            onClick={() => handleReferenceSelect(slot.type, ref)}
                                                            className="gap-2"
                                                        >
                                                            <div className="w-6 h-6 rounded overflow-hidden border border-white/10">
                                                                <img
                                                                    src={ref.signedUrl || ref.image_url}
                                                                    alt="Reference"
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                            <span className="flex-1 truncate text-xs">
                                                                {ref.name || 'Reference'}
                                                            </span>
                                                        </DropdownMenuItem>
                                                    ))}
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}

                            {/* Hidden file input */}
                            <input
                                ref={fileInputRefs[slot.type]}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileInputChange(slot.type)}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Helper text */}
            <p className="text-[10px] text-muted-foreground">
                Set anchors to maintain character consistency during generation.
            </p>

            {/* Library Picker Dialog */}
            <ImagePickerDialog
                isOpen={libraryPickerOpen}
                onClose={() => {
                    setLibraryPickerOpen(false);
                    setActiveSlot(null);
                }}
                onSelect={handleLibrarySelect}
                title={`Select ${activeSlot ? ANCHOR_SLOTS.find((s) => s.type === activeSlot)?.label : ''} Reference`}
            />
        </div>
    );
};
