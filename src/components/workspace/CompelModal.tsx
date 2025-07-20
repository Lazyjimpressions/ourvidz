
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface CompelModalProps {
  isOpen: boolean;
  onClose: () => void;
  compelEnabled: boolean;
  setCompelEnabled: (enabled: boolean) => void;
  compelWeights: string;
  setCompelWeights: (weights: string) => void;
}

export const CompelModal = ({
  isOpen,
  onClose,
  compelEnabled,
  setCompelEnabled,
  compelWeights,
  setCompelWeights
}: CompelModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle>Compel Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Enable Compel */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Enable Compel</label>
              <p className="text-xs text-gray-400">Advanced prompt weighting</p>
            </div>
            <Switch
              checked={compelEnabled}
              onCheckedChange={setCompelEnabled}
            />
          </div>

          {/* Compel Weights */}
          {compelEnabled && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Prompt Weights</label>
              <Textarea
                value={compelWeights}
                onChange={(e) => setCompelWeights(e.target.value)}
                placeholder="(beautiful woman:1.2), (detailed face:1.1), (blue eyes:0.8)"
                className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
                rows={4}
              />
              <p className="text-xs text-gray-400">
                Use parentheses and weights: (term:weight). Higher values emphasize, lower values de-emphasize.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
