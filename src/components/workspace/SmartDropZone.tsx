
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { analyzeImage, getOptimalStrength, ImageAnalysisResult } from '@/lib/imageAnalysis';
import { toast } from 'sonner';
import { User, Palette, Layout, Sparkles, Brain } from 'lucide-react';

interface SmartDropZoneProps {
  referenceType: 'character' | 'style' | 'composition';
  onDrop: (file: File | null, url: string, analysis?: ImageAnalysisResult) => void;
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent) => void;
  className?: string;
  isActive?: boolean;
  showCompatibility?: boolean;
}

const referenceTypeConfig = {
  character: {
    icon: User,
    label: 'Character',
    description: 'Faces & people',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500',
    tips: ['Works best with clear faces', 'Crop close to subject', 'Remove busy backgrounds']
  },
  style: {
    icon: Palette,
    label: 'Style',
    description: 'Art & technique',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500',
    tips: ['Artistic styles work best', 'Focus on color palette', 'Texture and brushwork']
  },
  composition: {
    icon: Layout,
    label: 'Composition',
    description: 'Layout & structure',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500',
    tips: ['Clear structural elements', 'Strong geometric forms', 'Balanced compositions']
  }
};

export const SmartDropZone = ({
  referenceType,
  onDrop,
  isDragging,
  onDragOver,
  onDragLeave,
  onDragEnter,
  className = '',
  isActive = false,
  showCompatibility = false
}: SmartDropZoneProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResult | null>(null);
  
  const config = referenceTypeConfig[referenceType];
  const Icon = config.icon;

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check for workspace asset data first
    const workspaceData = e.dataTransfer.getData('application/workspace-asset');
    if (workspaceData) {
      try {
        const assetData = JSON.parse(workspaceData);
        await processDroppedImage(null, assetData.url);
        return;
      } catch (error) {
        console.error('Failed to parse workspace asset data:', error);
      }
    }
    
    // Handle file drops
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      await processDroppedImage(imageFile, url);
    } else {
      toast.error('Please drop an image file');
    }
  };

  const processDroppedImage = async (file: File | null, url: string) => {
    setIsAnalyzing(true);
    
    try {
      // Analyze the image for smart recommendations
      const analysis = await analyzeImage(url);
      setAnalysisResult(analysis);
      
      // Check compatibility and show suggestions
      const isOptimalType = analysis.recommendedType === referenceType;
      
      if (!isOptimalType && showCompatibility) {
        const optimalTypeName = referenceTypeConfig[analysis.recommendedType].label;
        toast.info(
          `This image works better as ${optimalTypeName} reference. Consider switching.`,
          { duration: 4000 }
        );
      }
      
      // Show analysis insights
      if (analysis.hasFaces && referenceType === 'character') {
        toast.success('Face detected! Perfect for character reference.', { duration: 3000 });
      } else if (analysis.isArtistic && referenceType === 'style') {
        toast.success('Artistic style detected! Great for style reference.', { duration: 3000 });
      }
      
      onDrop(file, url, analysis);
      
    } catch (error) {
      console.error('Image analysis failed:', error);
      onDrop(file, url);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const compatibilityScore = analysisResult ? 
    (analysisResult.recommendedType === referenceType ? 100 : 
     referenceType === 'style' ? 70 : 50) : null;

  return (
    <div
      className={cn(
        'relative transition-all duration-300 rounded-lg border-2 border-dashed p-4',
        isDragging 
          ? `${config.borderColor} ${config.bgColor} scale-105 shadow-lg` 
          : isActive
            ? `${config.borderColor} ${config.bgColor}`
            : 'border-muted-foreground/30 hover:border-muted-foreground/50',
        className
      )}
      onDrop={handleDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDragEnter={onDragEnter}
    >
      {/* Main Icon and Label */}
      <div className="flex flex-col items-center justify-center text-center space-y-2">
        <div className={cn(
          'p-3 rounded-full transition-colors',
          isActive ? config.bgColor : 'bg-muted/50'
        )}>
          {isAnalyzing ? (
            <Brain className={cn('w-6 h-6 animate-pulse', config.color)} />
          ) : (
            <Icon className={cn('w-6 h-6', isActive ? config.color : 'text-muted-foreground')} />
          )}
        </div>
        
        <div>
          <h3 className={cn(
            'font-medium text-sm',
            isActive ? config.color : 'text-foreground'
          )}>
            {config.label}
          </h3>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </div>
      </div>

      {/* Analysis Results */}
      {analysisResult && compatibilityScore && (
        <div className="mt-3 p-2 bg-background/50 rounded border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium">Compatibility</span>
            <span className={cn(
              'text-xs font-bold',
              compatibilityScore >= 80 ? 'text-green-500' :
              compatibilityScore >= 60 ? 'text-yellow-500' : 'text-orange-500'
            )}>
              {compatibilityScore}%
            </span>
          </div>
          
          {analysisResult.hasFaces && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="w-3 h-3" />
              <span>Face detected</span>
            </div>
          )}
        </div>
      )}

      {/* Drop Indicator */}
      {isDragging && (
        <div className="absolute inset-0 bg-primary/20 rounded-lg flex items-center justify-center border-2 border-primary">
          <div className="text-center">
            <Sparkles className="w-8 h-8 text-primary mx-auto mb-2 animate-pulse" />
            <span className="text-sm font-medium text-primary">
              Analyzing & optimizing...
            </span>
          </div>
        </div>
      )}

      {/* Processing Indicator */}
      {isAnalyzing && (
        <div className="absolute inset-0 bg-background/80 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <Brain className="w-6 h-6 text-primary mx-auto mb-2 animate-pulse" />
            <span className="text-xs text-muted-foreground">Analyzing image...</span>
          </div>
        </div>
      )}
    </div>
  );
};
