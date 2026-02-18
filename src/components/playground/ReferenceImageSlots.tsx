import React, { useRef, useState } from 'react';
import { Plus, X, Upload, Library, FolderOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ImagePickerDialog } from '@/components/storyboard/ImagePickerDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export interface ReferenceImage {
  id: string;
  url: string;
  storagePath?: string;
  source: 'file' | 'library' | 'workspace';
}

interface ReferenceImageSlotsProps {
  images: ReferenceImage[];
  onChange: (images: ReferenceImage[]) => void;
  maxSlots: number;
  required?: boolean;
}

export const ReferenceImageSlots: React.FC<ReferenceImageSlotsProps> = ({
  images,
  onChange,
  maxSlots,
  required = false,
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingSource, setPendingSource] = useState<'library' | 'workspace'>('library');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/ref_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('reference_images')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: signedData } = await supabase.storage
        .from('reference_images')
        .createSignedUrl(path, 3600);

      if (signedData?.signedUrl) {
        onChange([
          ...images,
          { id: crypto.randomUUID(), url: signedData.signedUrl, storagePath: path, source: 'file' },
        ]);
      }
    } catch (err) {
      console.error('❌ Reference image upload failed:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePickerSelect = (imageUrl: string, source: 'library' | 'workspace') => {
    onChange([
      ...images,
      { id: crypto.randomUUID(), url: imageUrl, source },
    ]);
  };

  const handleRemove = (id: string) => {
    onChange(images.filter(img => img.id !== id));
  };

  const openPicker = (source: 'library' | 'workspace') => {
    setPendingSource(source);
    setPickerOpen(true);
  };

  const canAdd = images.length < maxSlots;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <span>Reference {required ? '(required)' : '(optional)'}</span>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {images.map((img) => (
          <div
            key={img.id}
            className="relative w-10 h-10 rounded border border-border overflow-hidden group"
          >
            <img src={img.url} alt="Ref" className="w-full h-full object-cover" />
            <button
              onClick={() => handleRemove(img.id)}
              className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}

        {canAdd && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'w-10 h-10 rounded border-2 border-dashed border-muted-foreground/30',
                  'flex items-center justify-center text-muted-foreground/50',
                  'hover:border-muted-foreground/60 hover:text-muted-foreground transition-colors',
                )}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-3.5 h-3.5 mr-2" />
                Upload file
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openPicker('library')}>
                <Library className="w-3.5 h-3.5 mr-2" />
                From library
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openPicker('workspace')}>
                <FolderOpen className="w-3.5 h-3.5 mr-2" />
                From workspace
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      <ImagePickerDialog
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePickerSelect}
        title={`Select from ${pendingSource}`}
      />
    </div>
  );
};
