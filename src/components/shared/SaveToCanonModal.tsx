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
  /** The storage path in user-library bucket — used directly as output_url (zero-copy) */
  storagePath: string;
  /** Optional pre-filled label */
  defaultLabel?: string;
  /** Tags from the source asset to carry over */
  sourceTags?: string[];
  /** Source library asset ID for traceability */
  sourceLibraryId?: string;
}

export const SaveToCanonModal: React.FC<SaveToCanonModalProps> = ({
  isOpen,
  onClose,
  storagePath,
  defaultLabel = '',
  sourceTags = [],
  sourceLibraryId,
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
      // Zero-copy: use the existing user-library storage path directly
      // Merge source tags with the role tag for the output type
      const roleTag = `role:${outputType}`;
      const mergedTags = Array.from(new Set([roleTag, ...sourceTags]));

      // Build metadata with traceability
      const metadata: Record<string, unknown> = {};
      if (sourceLibraryId) {
        metadata.source_library_id = sourceLibraryId;
      }
      const metadataValue = Object.keys(metadata).length > 0 ? metadata : null;

      // Insert character_canon row pointing to the same storage path
      const { error: insertError } = await supabase
        .from('character_canon')
        .insert({
          character_id: selectedCharacterId,
          output_type: outputType,
          output_url: storagePath,
          label: label.trim() || null,
          tags: mergedTags,
          metadata,
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
                {UNIFIED_OUTPUT_TYPES.map((t) => (
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
