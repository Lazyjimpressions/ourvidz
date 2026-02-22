import React, { useState, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PillFilter } from '@/components/ui/pill-filter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Star, ExternalLink, Tag, Plus, Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CharacterCanon } from '@/hooks/useCharacterStudio';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const OUTPUT_TYPES = ['all', 'pose', 'outfit', 'style', 'position'] as const;
type OutputTypeFilter = typeof OUTPUT_TYPES[number];

const COMMON_TAGS = ['front', 'side', 'rear', '3/4', 'full-body', 'half-body', 'close-up', 'casual', 'formal', 'action', 'seated', 'standing'];

interface PositionsGridProps {
  canonImages: CharacterCanon[];
  isNewCharacter: boolean;
  onUpload: (file: File, outputType: string, tags: string[], label?: string) => Promise<void>;
  onDelete: (id: string) => void;
  onSetPrimary: (id: string) => void;
  onUpdateTags: (id: string, tags: string[]) => void;
  isUploading?: boolean;
}

function CanonThumbnail({
  canon,
  onDelete,
  onSetPrimary,
  onUpdateTags,
}: {
  canon: CharacterCanon;
  onDelete: (id: string) => void;
  onSetPrimary: (id: string) => void;
  onUpdateTags: (id: string, tags: string[]) => void;
}) {
  const { signedUrl } = useSignedUrl(canon.output_url);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showActions, setShowActions] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [localTags, setLocalTags] = useState<string[]>(canon.tags || []);
  const [tagInput, setTagInput] = useState('');

  const handleSendToWorkspace = () => {
    if (signedUrl) {
      const encoded = encodeURIComponent(signedUrl);
      toast({
        title: 'Reference ready',
        description: 'Opening workspace with reference...',
      });
      navigate(`/workspace?mode=image&ref=${encoded}`);
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !localTags.includes(tag)) {
      const newTags = [...localTags, tag];
      setLocalTags(newTags);
      onUpdateTags(canon.id, newTags);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    const newTags = localTags.filter(t => t !== tag);
    setLocalTags(newTags);
    onUpdateTags(canon.id, newTags);
  };

  const handleToggleCommonTag = (tag: string) => {
    if (localTags.includes(tag)) {
      handleRemoveTag(tag);
    } else {
      const newTags = [...localTags, tag];
      setLocalTags(newTags);
      onUpdateTags(canon.id, newTags);
    }
  };

  return (
    <div
      className="relative aspect-[3/4] rounded-md overflow-hidden bg-muted group cursor-pointer"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setEditingTags(false); }}
      onClick={() => setShowActions(s => !s)}
    >
      {signedUrl ? (
        <img src={signedUrl} alt={canon.label || canon.output_type} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Type badge */}
      <Badge variant="secondary" className="absolute bottom-1 left-1 text-[9px] px-1 h-4 capitalize">
        {canon.output_type}
      </Badge>

      {/* Primary star */}
      {canon.is_primary && (
        <Star className="absolute top-1 right-1 w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
      )}

      {/* Label */}
      {canon.label && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-1">
          <span className="text-[10px] text-white/90 truncate block">{canon.label}</span>
        </div>
      )}

      {/* Hover actions */}
      {showActions && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-1.5 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(canon.id); }}
            className="p-1.5 rounded-full bg-destructive/80 hover:bg-destructive text-destructive-foreground"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onSetPrimary(canon.id); }}
            className={cn('p-1.5 rounded-full', canon.is_primary ? 'bg-yellow-500 text-black' : 'bg-white/20 hover:bg-white/40 text-white')}
            title="Set as primary"
          >
            <Star className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleSendToWorkspace(); }}
            className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white"
            title="Send to Workspace"
          >
            <ExternalLink className="w-3 h-3" />
          </button>
          <Popover open={editingTags} onOpenChange={setEditingTags}>
            <PopoverTrigger asChild>
              <button
                onClick={(e) => { e.stopPropagation(); setEditingTags(true); }}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white"
                title="Edit tags"
              >
                <Tag className="w-3 h-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 space-y-2" align="start" onClick={(e) => e.stopPropagation()}>
              <div className="flex flex-wrap gap-1">
                {COMMON_TAGS.map(tag => (
                  <PillFilter
                    key={tag}
                    active={localTags.includes(tag)}
                    onClick={() => handleToggleCommonTag(tag)}
                    size="sm"
                  >
                    {tag}
                  </PillFilter>
                ))}
              </div>
              <div className="flex gap-1">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="Custom tag..."
                  className="h-6 text-xs"
                />
                <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={handleAddTag}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              {localTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {localTags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[9px] cursor-pointer hover:bg-destructive/20" onClick={() => handleRemoveTag(tag)}>
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}

export function PositionsGrid({
  canonImages,
  isNewCharacter,
  onUpload,
  onDelete,
  onSetPrimary,
  onUpdateTags,
  isUploading,
}: PositionsGridProps) {
  const [typeFilter, setTypeFilter] = useState<OutputTypeFilter>('all');
  const [tagFilter, setTagFilter] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadPopover, setUploadPopover] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [newOutputType, setNewOutputType] = useState('pose');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const navigate = useNavigate();

  const filtered = canonImages.filter(c => {
    if (typeFilter !== 'all' && c.output_type !== typeFilter) return false;
    if (tagFilter && !c.tags?.some(t => t.includes(tagFilter.toLowerCase()))) return false;
    return true;
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
      setUploadPopover(true);
    }
    e.target.value = '';
  };

  const handleConfirmUpload = async () => {
    if (!pendingFile) return;
    await onUpload(pendingFile, newOutputType, newTags, newLabel || undefined);
    setPendingFile(null);
    setUploadPopover(false);
    setNewOutputType('pose');
    setNewTags([]);
    setNewLabel('');
  };

  if (isNewCharacter) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <p className="text-sm">Save your character first to add position references.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3">
      {/* Filter bar */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {OUTPUT_TYPES.map(type => (
          <PillFilter
            key={type}
            active={typeFilter === type}
            onClick={() => setTypeFilter(type)}
            size="sm"
          >
            {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
          </PillFilter>
        ))}
        <Input
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          placeholder="Filter tags..."
          className="h-6 w-24 text-xs ml-auto"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
        {filtered.map(canon => (
          <CanonThumbnail
            key={canon.id}
            canon={canon}
            onDelete={onDelete}
            onSetPrimary={onSetPrimary}
            onUpdateTags={onUpdateTags}
          />
        ))}

        {/* Upload button */}
        <Popover open={uploadPopover} onOpenChange={setUploadPopover}>
          <PopoverTrigger asChild>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-[3/4] rounded-md border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              {isUploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span className="text-[10px]">Upload</span>
                </>
              )}
            </button>
          </PopoverTrigger>
          {pendingFile && (
            <PopoverContent className="w-56 p-3 space-y-2" align="start">
              <p className="text-xs font-medium truncate">{pendingFile.name}</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={newOutputType} onValueChange={setNewOutputType}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pose">Pose</SelectItem>
                    <SelectItem value="outfit">Outfit</SelectItem>
                    <SelectItem value="style">Style</SelectItem>
                    <SelectItem value="position">Position</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Label (optional)</Label>
                <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Front neutral" className="h-7 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tags</Label>
                <div className="flex flex-wrap gap-1">
                  {COMMON_TAGS.slice(0, 8).map(tag => (
                    <PillFilter
                      key={tag}
                      active={newTags.includes(tag)}
                      onClick={() => setNewTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                      size="sm"
                    >
                      {tag}
                    </PillFilter>
                  ))}
                </div>
              </div>
              <Button size="sm" className="w-full h-7 text-xs" onClick={handleConfirmUpload} disabled={isUploading}>
                {isUploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Save
              </Button>
            </PopoverContent>
          )}
        </Popover>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

      {/* Create in Workspace link */}
      <button
        onClick={() => navigate('/workspace?mode=image')}
        className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-2"
      >
        Create in Workspace →
      </button>
    </div>
  );
}
