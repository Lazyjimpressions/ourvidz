import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UNIFIED_OUTPUT_TYPES } from '@/types/positionTags';

interface SaveToCanonModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The storage path in user-library bucket to copy from */
  storagePath: string;
  /** Optional pre-filled label */
  defaultLabel?: string;
}

export const SaveToCanonModal: React.FC<SaveToCanonModalProps> = ({
  isOpen,
  onClose,
  storagePath,
  defaultLabel = '',
}) => {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  const [outputType, setOutputType] = useState<string>('position');
  const [label, setLabel] = useState(defaultLabel);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch user's characters
  const { data: characters = [] } = useQuery({
    queryKey: ['user-characters-for-canon'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from('characters')
        .select('id, name, image_url')
        .eq('user_id', user.id)
        .order('name');
      return data || [];
    },
    enabled: isOpen,
  });

  const handleSave = async () => {
    if (!selectedCharacterId || !outputType) {
      toast.error('Please select a character and type');
      return;
    }

    setIsSaving(true);
    try {
      // Generate a destination path in reference_images bucket
      const fileName = storagePath.split('/').pop() || 'asset.png';
      const destPath = `${selectedCharacterId}/canon/${outputType}/${Date.now()}_${fileName}`;

      // Copy file from user-library to reference_images
      const { error: copyError } = await supabase.storage
        .from('user-library')
        .copy(storagePath, `../reference_images/${destPath}`);

      // If copy fails (cross-bucket not supported), download and re-upload
      if (copyError) {
        console.log('📦 Cross-bucket copy not supported, using download+upload fallback');
        const { data: downloadData, error: dlError } = await supabase.storage
          .from('user-library')
          .download(storagePath);
        if (dlError || !downloadData) throw dlError || new Error('Download failed');

        const { error: uploadError } = await supabase.storage
          .from('reference_images')
          .upload(destPath, downloadData, { contentType: downloadData.type });
        if (uploadError) throw uploadError;
      }

      // Insert character_canon row
      const { error: insertError } = await supabase
        .from('character_canon')
        .insert({
          character_id: selectedCharacterId,
          output_type: outputType,
          output_url: destPath,
          label: label.trim() || null,
          tags: [`role:${outputType}`],
        });

      if (insertError) throw insertError;

      toast.success('Saved to character canon');
      onClose();
    } catch (err) {
      console.error('❌ Failed to save to canon:', err);
      toast.error('Failed to save to canon');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Save to Character Canon</DialogTitle>
          <DialogDescription>
            Associate this asset with a character as a pose, outfit, or style reference.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Character selector */}
          <div className="space-y-2">
            <Label>Character</Label>
            <Select value={selectedCharacterId} onValueChange={setSelectedCharacterId}>
              <SelectTrigger>
                <SelectValue placeholder="Select character..." />
              </SelectTrigger>
              <SelectContent>
                {characters.map((char) => (
                  <SelectItem key={char.id} value={char.id}>
                    {char.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Output type */}
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={outputType} onValueChange={setOutputType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OUTPUT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Label */}
          <div className="space-y-2">
            <Label>Label (optional)</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Front pose, Red dress"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !selectedCharacterId}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save to Canon
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
