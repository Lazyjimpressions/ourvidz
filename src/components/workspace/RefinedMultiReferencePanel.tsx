
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Eye, Target, Clock, Image as ImageIcon, Copy, Palette, Layout, User, Sparkles } from "lucide-react";
import { SmartReferenceBlock } from './SmartReferenceBlock';
import { ReferencePreviewModal } from './ReferencePreviewModal';
import { ExactReproductionPreset } from './ExactReproductionPreset';
import { ReferenceHistoryPanel } from './ReferenceHistoryPanel';
import { analyzeImage, getOptimalStrength, ImageAnalysisResult } from '@/lib/imageAnalysis';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ReferenceItem {
  id: 'character' | 'style' | 'composition';
  label: string;
  description: string;
  file?: File | null;
  url?: string;
  thumbnailUrl?: string;
  enabled: boolean;
  isWorkspaceAsset?: boolean;
  icon: React.ElementType;
  analysis?: ImageAnalysisResult;
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
  const enabledCount = activeReferences.filter(ref => ref.enabled && ref.url).length;
  const primaryReference = activeReferences.find(ref => ref.enabled && ref.url);
  const isExactReproduction = strength >= 0.95;

  const handleSmartDrop = async (
    referenceType: 'character' | 'style' | 'composition',
    file: File | null,
    url: string,
    thumbnailUrl?: string,
    analysis?: ImageAnalysisResult
  ) => {
    // Auto-set optimal strength based on analysis
    const optimalStrength = analysis ? analysis.recommendedStrength : getOptimalStrength(referenceType);
    onStrengthChange(optimalStrength);

    // Update references with analysis data
    const updatedRefs = [...activeReferences];
    const existingIndex = updatedRefs.findIndex(ref => ref.id === referenceType);
    
    const newRef: ReferenceItem = {
      id: referenceType,
      label: referenceTypes.find(t => t.id === referenceType)?.label || '',
      description: referenceTypes.find(t => t.id === referenceType)?.description || '',
      file,
      url,
      thumbnailUrl,
      enabled: true,
      isWorkspaceAsset: !file,
      icon: referenceTypes.find(t => t.id === referenceType)?.icon || User,
      analysis
    };

    if (existingIndex >= 0) {
      updatedRefs[existingIndex] = newRef;
    } else {
      updatedRefs.push(newRef);
    }
    
    // Add to history
    const historyItem = {
      id: Date.now().toString(),
      url,
      thumbnailUrl,
      timestamp: new Date(),
      type: referenceType,
      strength: optimalStrength,
      analysis
    };
    setReferenceHistory(prev => [historyItem, ...prev.slice(0, 7)]);
    
    onReferencesChange(updatedRefs);
    
    // Show strength adjustment notification
    const typeName = referenceTypes.find(t => t.id === referenceType)?.label;
    toast.success(`${typeName} reference added with ${Math.round(optimalStrength * 100)}% strength`);
  };

  const handleReferenceToggle = (referenceType: 'character' | 'style' | 'composition', enabled: boolean) => {
    const updatedRefs = activeReferences.map(ref => 
      ref.id === referenceType ? { ...ref, enabled } : ref
    );
    onReferencesChange(updatedRefs);
  };

  const handleReferenceClear = (referenceType: 'character' | 'style' | 'composition') => {
    const updatedRefs = activeReferences.filter(ref => ref.id !== referenceType);
    onReferencesChange(updatedRefs);
  };

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

  return (
    <div className="mx-6 mt-4">
      <div className="bg-muted/20 rounded-xl border border-border p-6 space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">Smart Reference System</h3>
            {hasActiveReferences && (
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                <Sparkles className="w-3 h-3 mr-1" />
                {enabledCount} active
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

        {/* Reference Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {referenceTypes.map((type) => {
            const activeRef = activeReferences.find(ref => ref.id === type.id);

            return (
              <SmartReferenceBlock
                key={type.id}
                referenceType={type.id}
                url={activeRef?.url}
                thumbnailUrl={activeRef?.thumbnailUrl}
                enabled={activeRef?.enabled || false}
                analysis={activeRef?.analysis}
                onDrop={(file, url, thumbnailUrl, analysis) => 
                  handleSmartDrop(type.id, file, url, thumbnailUrl, analysis)
                }
                onClear={() => handleReferenceClear(type.id)}
                onPreview={activeRef?.url ? () => handlePreviewReference(activeRef.url!) : undefined}
                onToggle={(enabled) => handleReferenceToggle(type.id, enabled)}
              />
            );
          })}
        </div>

        {/* Global Strength Control */}
        {hasActiveReferences && (
          <div className="space-y-3 p-4 bg-background/50 rounded-lg border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Global Reference Strength</span>
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
        )}

        {/* Advanced Controls */}
        {showAdvanced && hasActiveReferences && (
          <>
            <Separator />
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Advanced Options</h4>
              
              <ReferenceHistoryPanel
                history={referenceHistory}
                onSelectReference={(item) => {
                  handleSmartDrop(item.type, null, item.url, item.thumbnailUrl, item.analysis);
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
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 mx-auto bg-muted/50 rounded-full flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Smart Reference System</h4>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Drag images from your workspace to the blocks above. AI will analyze and optimize settings automatically.
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
              <Sparkles className="w-3 h-3" />
              <span>AI optimizes strength automatically</span>
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
