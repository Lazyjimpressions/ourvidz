
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Eye, Upload, X, Target, Clock, Image as ImageIcon, Copy, Palette, Layout, User } from "lucide-react";
import { EnhancedReferenceImageButton } from './EnhancedReferenceImageButton';
import { ReferencePreviewModal } from './ReferencePreviewModal';
import { ExactReproductionPreset } from './ExactReproductionPreset';
import { ReferenceHistoryPanel } from './ReferenceHistoryPanel';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ReferenceItem {
  id: 'character' | 'style' | 'composition';
  label: string;
  description: string;
  file?: File | null;
  url?: string;
  enabled: boolean;
  isWorkspaceAsset?: boolean;
  icon: React.ElementType;
}

interface RefinedMultiReferencePanelProps {
  mode: 'image' | 'video';
  strength: number;
  onStrengthChange: (strength: number) => void;
  onReferencesChange: (references: ReferenceItem[]) => void;
  onClear: () => void;
  activeReferences?: ReferenceItem[];
  generatedImageUrl?: string;
}

export const RefinedMultiReferencePanel = ({
  mode,
  strength,
  onStrengthChange,
  onReferencesChange,
  onClear,
  activeReferences = [],
  generatedImageUrl
}: RefinedMultiReferencePanelProps) => {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedReferenceForPreview, setSelectedReferenceForPreview] = useState<string>('');
  const [referenceHistory, setReferenceHistory] = useState<any[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (mode === 'video') return null;

  const referenceTypes: Array<{
    id: 'character' | 'style' | 'composition';
    label: string;
    description: string;
    icon: React.ElementType;
  }> = [
    { id: 'character', label: 'Character', description: 'Preserve faces and people', icon: User },
    { id: 'style', label: 'Style', description: 'Match artistic style', icon: Palette },
    { id: 'composition', label: 'Layout', description: 'Copy structure', icon: Layout }
  ];

  const hasActiveReferences = activeReferences.some(ref => ref.enabled && ref.url);
  const primaryReference = activeReferences.find(ref => ref.enabled && ref.url);
  const isExactReproduction = strength >= 0.95;

  const handleExactReproductionPreset = () => {
    onStrengthChange(1.0);
    const updatedRefs = activeReferences.map(ref => ({
      ...ref,
      enabled: ref.id === 'character' ? true : ref.enabled
    }));
    onReferencesChange(updatedRefs);
  };

  const handlePreviewReference = (referenceUrl: string) => {
    setSelectedReferenceForPreview(referenceUrl);
    setShowPreviewModal(true);
  };

  const handleFileUpload = (referenceId: 'character' | 'style' | 'composition') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        const updatedRefs = activeReferences.map(ref => 
          ref.id === referenceId 
            ? { ...ref, file, url, enabled: true }
            : ref
        );
        
        const historyItem = {
          id: Date.now().toString(),
          url,
          timestamp: new Date(),
          type: referenceId,
          strength
        };
        setReferenceHistory(prev => [historyItem, ...prev.slice(0, 7)]);
        
        onReferencesChange(updatedRefs);
        toast.success(`${referenceTypes.find(t => t.id === referenceId)?.label} reference added`);
      }
    };
    input.click();
  };

  return (
    <div className="mx-6 mt-4">
      <div className="bg-muted/20 rounded-xl border border-border p-6 space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">Reference Images</h3>
            {hasActiveReferences && (
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {activeReferences.filter(ref => ref.enabled).length} active
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {hasActiveReferences && (
              <ExactReproductionPreset
                onApplyPreset={handleExactReproductionPreset}
                isActive={isExactReproduction}
              />
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Advanced</span>
              <Switch
                checked={showAdvanced}
                onCheckedChange={setShowAdvanced}
              />
            </div>
          </div>
        </div>

        {/* Primary Reference Display - Prominent when active */}
        {primaryReference && (
          <div className="bg-background/50 rounded-lg p-4 border border-border">
            <div className="flex items-start gap-4">
              <EnhancedReferenceImageButton
                referenceImage={primaryReference.file}
                referenceImageUrl={primaryReference.url}
                onReferenceChange={(file, url) => {
                  const updatedRefs = activeReferences.map(ref => 
                    ref.id === primaryReference.id 
                      ? { ...ref, file, url, enabled: true }
                      : ref
                  );
                  onReferencesChange(updatedRefs);
                }}
                onClear={() => {
                  const updatedRefs = activeReferences.map(ref => 
                    ref.id === primaryReference.id 
                      ? { ...ref, url: '', file: null, enabled: false }
                      : ref
                  );
                  onReferencesChange(updatedRefs);
                }}
                onPreview={() => handlePreviewReference(primaryReference.url!)}
                size="large"
                showPresets={true}
              />
              
              <div className="flex-1 space-y-3">
                <div>
                  <h4 className="font-medium text-foreground">Primary Reference</h4>
                  <p className="text-sm text-muted-foreground">
                    {referenceTypes.find(t => t.id === primaryReference.id)?.description}
                  </p>
                  {primaryReference.isWorkspaceAsset && (
                    <Badge variant="outline" className="mt-1">From Workspace</Badge>
                  )}
                </div>
                
                {/* Strength Control - Prominent */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Reference Strength</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{Math.round(strength * 100)}%</span>
                      {isExactReproduction && (
                        <Badge variant="default" className="bg-green-600 text-white">EXACT</Badge>
                      )}
                    </div>
                  </div>
                  <Slider
                    value={[strength]}
                    onValueChange={(values) => onStrengthChange(values[0])}
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Subtle</span>
                    <span>Balanced</span>
                    <span>Exact Copy</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reference Type Grid - Compact when primary is active */}
        <div className={cn(
          "grid gap-3",
          primaryReference ? "grid-cols-3" : "grid-cols-1 md:grid-cols-3"
        )}>
          {referenceTypes.map((type) => {
            const activeRef = activeReferences.find(ref => ref.id === type.id);
            const hasReference = activeRef?.url;
            const isPrimary = primaryReference?.id === type.id;

            if (isPrimary && primaryReference) return null; // Already shown above

            return (
              <div key={type.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <type.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{type.label}</span>
                  {hasReference && !isPrimary && (
                    <Badge variant="outline">Active</Badge>
                  )}
                </div>

                <EnhancedReferenceImageButton
                  referenceImage={activeRef?.file}
                  referenceImageUrl={activeRef?.url}
                  onReferenceChange={(file, url) => {
                    const updatedRefs = activeReferences.map(ref => 
                      ref.id === type.id 
                        ? { ...ref, file, url, enabled: true }
                        : ref
                    );
                    onReferencesChange(updatedRefs);
                  }}
                  onClear={() => {
                    const updatedRefs = activeReferences.map(ref => 
                      ref.id === type.id 
                        ? { ...ref, url: '', file: null, enabled: false }
                        : ref
                    );
                    onReferencesChange(updatedRefs);
                  }}
                  onPreview={hasReference ? () => handlePreviewReference(activeRef!.url!) : undefined}
                  size={primaryReference ? "compact" : "standard"}
                />
                
                <p className="text-xs text-muted-foreground">{type.description}</p>
              </div>
            );
          })}
        </div>

        {/* Advanced Controls */}
        {showAdvanced && hasActiveReferences && (
          <>
            <Separator />
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Advanced Options</h4>
              
              <ReferenceHistoryPanel
                history={referenceHistory}
                onSelectReference={(item) => {
                  const updatedRefs = activeReferences.map(ref => 
                    ref.id === item.type ? { ...ref, url: item.url, enabled: true } : ref
                  );
                  onReferencesChange(updatedRefs);
                  if (item.strength) {
                    onStrengthChange(item.strength);
                  }
                }}
                onClearHistory={() => setReferenceHistory([])}
              />
            </div>
          </>
        )}

        {/* Empty State */}
        {!hasActiveReferences && (
          <div className="text-center py-8 space-y-3">
            <ImageIcon className="w-12 h-12 text-muted-foreground/50 mx-auto" />
            <div>
              <h4 className="font-medium text-foreground">No reference images</h4>
              <p className="text-sm text-muted-foreground">
                Upload reference images or drag from workspace to influence your generation
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {hasActiveReferences && (
          <div className="flex justify-between items-center pt-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
              className="text-muted-foreground"
            >
              Clear All References
            </Button>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Tip: Drag images from your workspace above</span>
            </div>
          </div>
        )}

        <ReferencePreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          referenceUrl={selectedReferenceForPreview}
          generatedUrl={generatedImageUrl}
        />
      </div>
    </div>
  );
};
