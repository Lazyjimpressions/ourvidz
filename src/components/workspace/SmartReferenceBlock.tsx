
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Palette, Layout, Eye, X, Sparkles, Brain } from "lucide-react";
import { cn } from '@/lib/utils';
import { analyzeImage, ImageAnalysisResult } from '@/lib/imageAnalysis';
import { toast } from 'sonner';

interface SmartReferenceBlockProps {
  referenceType: 'character' | 'style' | 'composition';
  url?: string;
  thumbnailUrl?: string;
  enabled: boolean;
  analysis?: ImageAnalysisResult;
  onDrop: (file: File | null, url: string, thumbnailUrl?: string, analysis?: ImageAnalysisResult) => void;
  onClear: () => void;
  onPreview?: () => void;
  onToggle: (enabled: boolean) => void;
  className?: string;
}

const referenceConfig = {
  character: {
    icon: User,
    label: 'Character',
    description: 'Preserve faces & identity',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/50',
    hoverBorder: 'hover:border-blue-500'
  },
  style: {
    icon: Palette,
    label: 'Style',
    description: 'Match art & technique',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/50',
    hoverBorder: 'hover:border-purple-500'
  },
  composition: {
    icon: Layout,
    label: 'Layout',
    description: 'Copy structure & pose',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/50',
    hoverBorder: 'hover:border-green-500'
  }
};

export const SmartReferenceBlock = ({
  referenceType,
  url,
  thumbnailUrl,
  enabled,
  analysis,
  onDrop,
  onClear,
  onPreview,
  onToggle,
  className
}: SmartReferenceBlockProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const config = referenceConfig[referenceType];
  const Icon = config.icon;
  const hasReference = url && url.length > 0;
  const displayUrl = thumbnailUrl || url;

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    // Handle workspace asset data
    const workspaceData = e.dataTransfer.getData('application/workspace-asset');
    if (workspaceData) {
      try {
        const assetData = JSON.parse(workspaceData);
        await processImage(null, assetData.url, assetData.thumbnailUrl);
        return;
      } catch (error) {
        console.error('Failed to parse workspace asset:', error);
      }
    }
    
    // Handle file drops
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      const fileUrl = URL.createObjectURL(imageFile);
      await processImage(imageFile, fileUrl);
    } else {
      toast.error('Please drop an image file or workspace asset');
    }
  };

  const processImage = async (file: File | null, imageUrl: string, thumbnailUrl?: string) => {
    setIsAnalyzing(true);
    
    try {
      const analysis = await analyzeImage(imageUrl);
      
      // Show compatibility feedback
      const isOptimal = analysis.recommendedType === referenceType;
      if (!isOptimal) {
        const optimalName = referenceConfig[analysis.recommendedType].label;
        toast.info(`Tip: This image works better as ${optimalName} reference`, { duration: 3000 });
      } else {
        toast.success(`Perfect ${config.label.toLowerCase()} reference detected!`, { duration: 2000 });
      }
      
      onDrop(file, imageUrl, thumbnailUrl, analysis);
      
    } catch (error) {
      console.error('Image analysis failed:', error);
      onDrop(file, imageUrl, thumbnailUrl);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Active reference view
  if (hasReference) {
    return (
      <div className={cn("space-y-3", className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={cn("w-4 h-4", config.color)} />
            <span className="text-sm font-medium">{config.label}</span>
            {analysis && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                <Brain className="w-3 h-3 mr-1" />
                Smart
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggle(!enabled)}
              className={cn(
                "h-6 px-2 text-xs",
                enabled 
                  ? "bg-primary/10 text-primary hover:bg-primary/20" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {enabled ? 'Active' : 'Disabled'}
            </Button>
          </div>
        </div>

        {/* Image Preview */}
        <div className={cn(
          "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
          enabled 
            ? `${config.borderColor} ${config.bgColor}` 
            : "border-muted-foreground/20 opacity-60"
        )}>
          <img
            src={displayUrl}
            alt={`${config.label} reference`}
            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
            onClick={onPreview}
          />
          
          {/* Overlay Actions */}
          <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            {onPreview && (
              <Button size="sm" variant="secondary" onClick={onPreview} className="h-7 w-7 p-0">
                <Eye className="w-3 h-3" />
              </Button>
            )}
            <Button size="sm" variant="destructive" onClick={onClear} className="h-7 w-7 p-0">
              <X className="w-3 h-3" />
            </Button>
          </div>

          {/* Status Indicator */}
          {enabled && (
            <div className="absolute top-2 right-2">
              <div className={cn("w-2 h-2 rounded-full", config.color.replace('text-', 'bg-'))} />
            </div>
          )}
        </div>

        {/* Analysis Info */}
        {analysis && enabled && (
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex items-center justify-between">
              <span>Recommended strength:</span>
              <span className="font-medium">{Math.round(analysis.recommendedStrength * 100)}%</span>
            </div>
            {analysis.hasFaces && referenceType === 'character' && (
              <div className="flex items-center gap-1 text-green-600">
                <User className="w-3 h-3" />
                <span>Face detected</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Empty drop zone
  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Icon className={cn("w-4 h-4", config.color)} />
        <span className="text-sm font-medium">{config.label}</span>
      </div>

      {/* Drop Zone */}
      <div
        className={cn(
          "relative aspect-square border-2 border-dashed rounded-lg transition-all cursor-pointer",
          "flex flex-col items-center justify-center p-4 text-center",
          isDragging 
            ? `${config.borderColor} ${config.bgColor} scale-105 shadow-lg` 
            : `border-muted-foreground/30 ${config.hoverBorder} hover:bg-muted/20`
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {isAnalyzing ? (
          <>
            <Brain className={cn("w-8 h-8 mb-2 animate-pulse", config.color)} />
            <span className="text-sm text-muted-foreground">Analyzing...</span>
          </>
        ) : (
          <>
            <Icon className={cn("w-8 h-8 mb-2", config.color)} />
            <div className="space-y-1">
              <div className="text-sm font-medium">Drop {config.label}</div>
              <div className="text-xs text-muted-foreground">{config.description}</div>
            </div>
          </>
        )}

        {/* Drop Indicator */}
        {isDragging && (
          <div className="absolute inset-0 bg-primary/20 rounded-lg flex items-center justify-center border-2 border-primary">
            <div className="text-center">
              <Sparkles className="w-6 h-6 text-primary mx-auto mb-1 animate-pulse" />
              <span className="text-sm font-medium text-primary">Drop here</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
