import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { 
  Copy, 
  FileText, 
  Sparkles, 
  Zap, 
  Tag,
  CheckCircle2,
  Settings,
  ChevronDown,
  ChevronRight,
  Info,
  Star,
  BarChart3,
  RefreshCw,
  Shield,
  Save,
  X
} from 'lucide-react';
import { useFetchImageDetails } from '@/hooks/useFetchImageDetails';
import { toast } from '@/hooks/use-toast';
import { PromptScoringService } from '@/lib/services/PromptScoringService';
import { useAuth } from '@/contexts/AuthContext';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface PromptDetailsSliderProps {
  assetId: string;
  assetType: 'image' | 'video';
  jobType?: string;
  quality?: string;
  trigger: React.ReactNode;
}

export const PromptDetailsSlider: React.FC<PromptDetailsSliderProps> = ({
  assetId,
  assetType,
  jobType,
  quality,
  trigger
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [originalPromptExpanded, setOriginalPromptExpanded] = useState(false);
  const [enhancedPromptExpanded, setEnhancedPromptExpanded] = useState(false);
  const { fetchDetails, loading, details } = useFetchImageDetails();

  useEffect(() => {
    if (isOpen && assetId) {
      fetchDetails(assetId);
    }
  }, [isOpen, assetId, fetchDetails]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
        duration: 2000,
      });
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  const copyAllMetadata = async () => {
    if (!details) return;
    
    const metadata = [
      details.modelUsed && `Model: ${details.modelUsed}`,
      details.templateName && `Template: ${details.templateName}`,
      details.originalPrompt && `Original Prompt: ${details.originalPrompt}`,
      details.enhancedPrompt && `Enhanced Prompt: ${details.enhancedPrompt}`,
      details.seed && `Seed: ${details.seed}`,
      details.referenceStrength && `Reference Strength: ${(details.referenceStrength * 100).toFixed(0)}%`,
      details.denoiseStrength && `Denoise Strength: ${(details.denoiseStrength * 100).toFixed(0)}%`,
      details.guidanceScale && `Guidance Scale: ${details.guidanceScale}`,
      details.steps && `Steps: ${details.steps}`,
      details.lockHair !== undefined && `Hair Lock: ${details.lockHair ? 'ON' : 'OFF'}`,
      details.exactCopyMode !== undefined && `Exact Copy Mode: ${details.exactCopyMode ? 'ON' : 'OFF'}`,
      details.referenceMode && `Reference Mode: ${details.referenceMode}`,
      details.generationTime && `Generation Time: ${details.generationTime}s`
    ].filter(Boolean).join('\n');
    
    await copyToClipboard(metadata, 'All metadata');
  };

  const getJobTypeFormatted = () => {
    // Prioritize fetched details over props
    if (details?.jobType) return details.jobType;
    if (jobType) return jobType;
    
    // Fallback formatting based on fetched quality or prop quality
    const detectedQuality = details?.quality || quality;
    const qualityText = detectedQuality === 'high' ? 'High Quality' : 'Fast';
    const typeText = assetType === 'image' ? 'Image' : 'Video';
    return `${typeText} (${qualityText})`;
  };

  const getJobTypeBadgeVariant = () => {
    // Check fetched quality first, then prop quality
    const detectedQuality = details?.quality || quality;
    if (detectedQuality === 'high' || details?.jobType?.toLowerCase().includes('high')) {
      return 'border-purple-500/20 text-purple-400';
    }
    return 'border-blue-500/20 text-blue-400';
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger}
      </SheetTrigger>
      <SheetContent side="right" className="w-[380px] sm:w-[380px]">
        <SheetHeader className="pb-3">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            Generation Details
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 max-h-[calc(100vh-120px)] overflow-y-auto pr-2">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/30 border-t-primary"></div>
            </div>
          )}

          {!loading && details && (
            <>
              {/* Header with Copy All */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                  <h4 className="font-medium text-xs">Generation Summary</h4>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyAllMetadata}
                  className="h-6 text-xs px-2"
                  aria-label="Copy all metadata"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy All
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Badge 
                  variant="outline" 
                  className={`w-fit text-xs ${getJobTypeBadgeVariant()}`}
                >
                  {getJobTypeFormatted()}
                </Badge>
                {details?.modelUsed && (
                  <Badge 
                    variant="outline" 
                    className="w-fit text-xs border-amber-500/20 text-amber-400"
                  >
                    Model: {details.modelUsed}
                  </Badge>
                )}
              </div>

              {/* Template Name */}
              {(details?.templateName || details?.sceneTemplateName) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    <h4 className="font-medium text-xs">Template</h4>
                  </div>
                  <div className="space-y-1.5">
                    {details.templateName && (
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className="border-emerald-500/20 text-emerald-400 text-xs"
                        >
                          Chat: {details.templateName}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(details.templateName!, 'Template name')}
                          className="h-5 w-5 p-0"
                          aria-label="Copy template name"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {details?.sceneTemplateName && (
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className="border-purple-500/20 text-purple-400 text-xs"
                        >
                          Scene: {details.sceneTemplateName}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(details.sceneTemplateName!, 'Scene template name')}
                          className="h-5 w-5 p-0"
                          aria-label="Copy scene template name"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Style & Framing */}
              {(details?.aspectRatio || details?.cameraAngle || details?.shotType || details?.style) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                    <h4 className="font-medium text-xs">Style & Framing</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {details.aspectRatio && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Aspect:</span>
                        <Badge variant="outline" className="text-xs">{details.aspectRatio}</Badge>
                      </div>
                    )}
                    {details.cameraAngle && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Angle:</span>
                        <Badge variant="outline" className="text-xs">{details.cameraAngle}</Badge>
                      </div>
                    )}
                    {details.shotType && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Shot:</span>
                        <Badge variant="outline" className="text-xs">{details.shotType}</Badge>
                      </div>
                    )}
                    {details.style && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Style:</span>
                        <Badge variant="outline" className="text-xs">{details.style}</Badge>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Original Prompt */}
              {details?.originalPrompt && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <h4 className="font-medium text-xs">Original Prompt</h4>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setOriginalPromptExpanded(!originalPromptExpanded)}
                      className="h-5 w-5 p-0"
                      aria-label={originalPromptExpanded ? "Collapse original prompt" : "Expand original prompt"}
                    >
                      {originalPromptExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </Button>
                  </div>
                  {originalPromptExpanded && (
                    <div className="relative">
                      <div className="text-xs bg-muted/50 p-2 rounded border max-h-24 overflow-y-auto">
                        <p className="break-words leading-relaxed whitespace-pre-wrap pr-6">
                          {details.originalPrompt}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(details.originalPrompt!, 'Original prompt')}
                        className="absolute top-1 right-1 h-5 w-5 p-0 bg-background/80 hover:bg-background/90"
                        aria-label="Copy original prompt"
                      >
                        <Copy className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Enhanced Prompt */}
              {details?.enhancedPrompt && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                      <h4 className="font-medium text-xs">Enhanced Prompt</h4>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEnhancedPromptExpanded(!enhancedPromptExpanded)}
                      className="h-5 w-5 p-0"
                      aria-label={enhancedPromptExpanded ? "Collapse enhanced prompt" : "Expand enhanced prompt"}
                    >
                      {enhancedPromptExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </Button>
                  </div>
                  {enhancedPromptExpanded && (
                    <div className="relative">
                      <div className="text-xs bg-muted/50 p-2 rounded border max-h-24 overflow-y-auto">
                        <p className="break-words leading-relaxed whitespace-pre-wrap pr-6">
                          {details.enhancedPrompt}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(details.enhancedPrompt!, 'Enhanced prompt')}
                        className="absolute top-1 right-1 h-5 w-5 p-0 bg-background/80 hover:bg-background/90"
                        aria-label="Copy enhanced prompt"
                      >
                        <Copy className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Generation Details - Universal for all jobs */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  <h4 className="font-medium text-xs">Generation Details</h4>
                </div>
                <div className="space-y-1.5 text-xs">
                  {details.seed && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Seed:</span>
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{details.seed}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(details.seed!.toString(), 'Seed')}
                          className="h-4 w-4 p-0"
                          aria-label="Copy seed"
                        >
                          <Copy className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {details.steps && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Steps:</span>
                      <span>{details.steps}</span>
                    </div>
                  )}

                  {details.guidanceScale && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Guidance Scale:</span>
                      <span>{details.guidanceScale}</span>
                    </div>
                  )}

                  {details.scheduler && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Scheduler:</span>
                      <Badge variant="outline" className="text-xs px-1.5 py-0.5">{details.scheduler}</Badge>
                    </div>
                  )}

                  {details.denoiseStrength !== undefined && details.referenceStrength && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Denoise Strength:</span>
                      <span>{(details.denoiseStrength * 100).toFixed(0)}%</span>
                    </div>
                  )}

                  {details.generationTime && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Generation Time:</span>
                      <span>{details.generationTime}s</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ✅ VALIDATION: Replicate Actual Data - Show what Replicate actually used */}
              {details?.replicateActualInput && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                    <h4 className="font-medium text-xs">Replicate Validation</h4>
                    <Badge variant="outline" className="text-xs border-blue-500/20 text-blue-400 px-1.5 py-0.5">
                      actual API data
                    </Badge>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {details.promptLength !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Prompt Length:</span>
                        <div className="flex items-center gap-1">
                          <span>{details.promptLength} chars</span>
                          {details.promptTruncated && (
                            <Badge variant="destructive" className="text-xs px-1 py-0">
                              Truncated
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {details.replicateActualInput?.seed !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Actual Seed:</span>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{details.replicateActualInput.seed}</code>
                      </div>
                    )}
                    
                    {(details.replicateActualInput?.strength !== undefined || details.replicateActualInput?.prompt_strength !== undefined) && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Actual Strength:</span>
                        <span>{(details.replicateActualInput.strength || details.replicateActualInput.prompt_strength || 0).toFixed(2)}</span>
                      </div>
                    )}
                    
                    {details.replicateActualInput?.image && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Used Reference Image:</span>
                        <Badge variant="default" className="text-xs px-1.5 py-0.5">Yes</Badge>
                      </div>
                    )}
                    
                    {details.replicateActualInput?.prompt && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Actual Prompt:</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(details.replicateActualInput.prompt, 'Actual prompt')}
                            className="h-4 w-4 p-0"
                            aria-label="Copy actual prompt"
                          >
                            <Copy className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                        <div className="text-xs bg-muted/50 p-2 rounded border max-h-20 overflow-y-auto">
                          <p className="break-words leading-relaxed whitespace-pre-wrap">
                            {String(details.replicateActualInput.prompt).substring(0, 200)}
                            {String(details.replicateActualInput.prompt).length > 200 && '...'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Verified i2i Settings - Only show if referenceStrength exists (actual i2i job) */}
              {details?.referenceStrength && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <h4 className="font-medium text-xs">Verified i2i Settings</h4>
                    <Badge variant="outline" className="text-xs border-emerald-500/20 text-emerald-400 px-1.5 py-0.5">
                      from job log
                    </Badge>
                  </div>
                   <div className="space-y-1.5 text-xs">
                     {details.referenceMode && (
                       <div className="flex items-center justify-between">
                         <span className="text-muted-foreground">Reference Mode:</span>
                         <span className="capitalize">{details.referenceMode}</span>
                       </div>
                     )}
                     
                     <div className="flex items-center justify-between">
                       <span className="text-muted-foreground">Reference Strength:</span>
                       <span>{(details.referenceStrength * 100).toFixed(0)}%</span>
                     </div>

                     {details.lockHair !== undefined && (
                       <div className="flex items-center justify-between">
                         <span className="text-muted-foreground">Hair Lock:</span>
                         <Badge variant={details.lockHair ? "default" : "secondary"} className="text-xs px-1.5 py-0.5">
                           {details.lockHair ? 'ON' : 'OFF'}
                         </Badge>
                       </div>
                     )}

                     {details.exactCopyMode !== undefined && (
                       <div className="flex items-center justify-between">
                         <span className="text-muted-foreground">Exact Copy Mode:</span>
                         <Badge variant={details.exactCopyMode ? "default" : "secondary"} className="text-xs px-1.5 py-0.5">
                           {details.exactCopyMode ? 'ON' : 'OFF'}
                         </Badge>
                       </div>
                     )}
                   </div>
                </div>
              )}

              {/* Prompt Score Section */}
              {details?.jobId && (
                <PromptScoreSection jobId={details.jobId} />
              )}

              {/* No Details Message */}
              {!loading && !details && (
                <div className="text-center py-6 text-muted-foreground">
                  <FileText className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No generation details available</p>
                  <p className="text-xs mt-1 opacity-75">This asset may have been imported or generated externally</p>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

/**
 * Inline star rating row for a single dimension.
 */
const DimensionStars: React.FC<{
  label: string;
  value: number;
  hoverValue: number | null;
  onRate: (v: number) => void;
  onHover: (v: number | null) => void;
}> = ({ label, value, hoverValue, onRate, onHover }) => {
  const display = hoverValue ?? value;
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((r) => (
          <button
            key={r}
            onClick={() => onRate(r)}
            onMouseEnter={() => onHover(r)}
            onMouseLeave={() => onHover(null)}
            className="p-0.5 transition-transform hover:scale-125 focus:outline-none"
            title={`Rate ${r}/5`}
          >
            <Star
              className={cn(
                'w-3.5 h-3.5 transition-colors',
                r <= display
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-transparent text-muted-foreground hover:text-yellow-300'
              )}
            />
          </button>
        ))}
        {value > 0 && (
          <span className="text-xs text-muted-foreground ml-1.5">{value}/5</span>
        )}
      </div>
    </div>
  );
};

const FEEDBACK_TAG_OPTIONS = [
  'wrong_pose', 'good_likeness', 'bad_hands', 'wrong_outfit',
  'good_composition', 'bad_anatomy', 'good_lighting', 'artifacts',
  'wrong_background', 'excellent_quality', 'blurry', 'extra_limbs',
];

/**
 * Collapsible section showing prompt scores, user ratings, and admin controls.
 * Fetches score data only when expanded (single query).
 */
const PromptScoreSection: React.FC<{ jobId: string }> = ({ jobId }) => {
  const { user, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [score, setScore] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScoring, setIsScoring] = useState(false);

  // Per-dimension user ratings
  const [actionRating, setActionRating] = useState(0);
  const [appearanceRating, setAppearanceRating] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [hoverAction, setHoverAction] = useState<number | null>(null);
  const [hoverAppearance, setHoverAppearance] = useState<number | null>(null);
  const [hoverQuality, setHoverQuality] = useState<number | null>(null);

  // Admin fields
  const [adminActionRating, setAdminActionRating] = useState(0);
  const [adminAppearanceRating, setAdminAppearanceRating] = useState(0);
  const [adminQualityRating, setAdminQualityRating] = useState(0);
  const [feedbackTags, setFeedbackTags] = useState<string[]>([]);
  const [adminComment, setAdminComment] = useState('');
  const [preserveImage, setPreserveImage] = useState(false);
  const [preserveReason, setPreserveReason] = useState('');
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);

  const fetchScore = useCallback(async () => {
    setIsLoading(true);
    const data = await PromptScoringService.fetchScoreForJob(jobId);
    setScore(data);
    if (data) {
      setActionRating(data.user_action_rating || 0);
      setAppearanceRating(data.user_appearance_rating || 0);
      setQualityRating(data.user_quality_rating || 0);
      // Admin fields
      setAdminActionRating(data.admin_action_rating || 0);
      setAdminAppearanceRating(data.admin_appearance_rating || 0);
      setAdminQualityRating(data.admin_quality_rating || 0);
      setFeedbackTags(data.feedback_tags || []);
      setAdminComment(data.admin_comment || '');
      setPreserveImage(data.preserve_image || false);
      setPreserveReason(data.preserve_reason || '');
    }
    setIsLoading(false);
  }, [jobId]);

  useEffect(() => {
    if (isOpen && !score && !isLoading) {
      fetchScore();
    }
  }, [isOpen, score, isLoading, fetchScore]);

  const handleDimensionRate = useCallback(async (
    dimension: 'user_action_rating' | 'user_appearance_rating' | 'user_quality_rating',
    value: number,
    setter: (v: number) => void
  ) => {
    if (!user?.id) return;
    setter(value);
    const result = await PromptScoringService.updateIndividualRating(jobId, user.id, dimension, value);
    if (result.success) {
      toast({ title: `Rating updated`, duration: 1500 });
      fetchScore();
    } else {
      toast({ title: 'Failed to save rating', variant: 'destructive', duration: 2000 });
      setter(0);
    }
  }, [jobId, user?.id, fetchScore]);

  const handleTriggerScoring = useCallback(async () => {
    if (!user?.id) return;
    setIsScoring(true);

    // Get signed image URL
    const { url: signedUrl, error: urlError } = await PromptScoringService.getSignedImageUrl(jobId);
    if (!signedUrl) {
      toast({ title: 'Could not resolve image URL', description: urlError, variant: 'destructive', duration: 3000 });
      setIsScoring(false);
      return;
    }

    // Get prompt from score or fetch job
    const prompt = score?.original_prompt || '';
    if (!prompt) {
      toast({ title: 'No prompt found for scoring', variant: 'destructive', duration: 2000 });
      setIsScoring(false);
      return;
    }

    const result = await PromptScoringService.triggerVisionScoring(jobId, signedUrl, prompt, {
      enhancedPrompt: score?.enhanced_prompt,
      apiModelId: score?.api_model_id,
      userId: user.id,
      force: !!score?.vision_analysis, // force if re-scoring
    });

    if (result.success) {
      toast({ title: 'Scoring triggered', description: 'Results will appear shortly...', duration: 3000 });
      // Poll for results
      setTimeout(() => {
        fetchScore();
        setIsScoring(false);
      }, 8000);
    } else {
      toast({ title: 'Scoring failed', description: result.error, variant: 'destructive', duration: 3000 });
      setIsScoring(false);
    }
  }, [jobId, user?.id, score, fetchScore]);

  const handleSaveAdmin = useCallback(async () => {
    if (!user?.id) return;
    setIsSavingAdmin(true);
    const result = await PromptScoringService.updateAdminScoring(jobId, user.id, {
      admin_action_rating: adminActionRating || undefined,
      admin_appearance_rating: adminAppearanceRating || undefined,
      admin_quality_rating: adminQualityRating || undefined,
      feedback_tags: feedbackTags,
      admin_comment: adminComment || undefined,
      preserve_image: preserveImage,
      preserve_reason: preserveReason || undefined,
    });
    if (result.success) {
      toast({ title: 'Admin scoring saved', duration: 2000 });
      fetchScore();
    } else {
      toast({ title: 'Failed to save', variant: 'destructive', duration: 2000 });
    }
    setIsSavingAdmin(false);
  }, [jobId, user?.id, adminActionRating, adminAppearanceRating, adminQualityRating, feedbackTags, adminComment, preserveImage, preserveReason, fetchScore]);

  const toggleTag = (tag: string) => {
    setFeedbackTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const getScoreColor = (val: number | null) => {
    if (!val) return 'text-muted-foreground';
    if (val >= 4) return 'text-emerald-400';
    if (val >= 2.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (val: number | null) => {
    if (!val) return 'border-muted';
    if (val >= 4) return 'border-emerald-500/30 bg-emerald-500/10';
    if (val >= 2.5) return 'border-yellow-500/30 bg-yellow-500/10';
    return 'border-red-500/30 bg-red-500/10';
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-1.5 w-full text-left py-1 group">
          <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
          <h4 className="font-medium text-xs">Prompt Score</h4>
          {score?.composite_score && (
            <Badge variant="outline" className={cn('text-xs ml-auto mr-1', getScoreBg(score.composite_score), getScoreColor(score.composite_score))}>
              {score.composite_score}/5
            </Badge>
          )}
          {isOpen ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary/30 border-t-primary" />
          </div>
        )}

        {!isLoading && (
          <>
            {/* Per-Dimension User Ratings */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Your Rating</span>
              <div className="space-y-1.5">
                <DimensionStars
                  label="Action Match"
                  value={actionRating}
                  hoverValue={hoverAction}
                  onRate={(v) => handleDimensionRate('user_action_rating', v, setActionRating)}
                  onHover={setHoverAction}
                />
                <DimensionStars
                  label="Appearance"
                  value={appearanceRating}
                  hoverValue={hoverAppearance}
                  onRate={(v) => handleDimensionRate('user_appearance_rating', v, setAppearanceRating)}
                  onHover={setHoverAppearance}
                />
                <DimensionStars
                  label="Quality"
                  value={qualityRating}
                  hoverValue={hoverQuality}
                  onRate={(v) => handleDimensionRate('user_quality_rating', v, setQualityRating)}
                  onHover={setHoverQuality}
                />
              </div>
            </div>

            {/* Vision Analysis Scores */}
            {score?.action_match && (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Vision Analysis</span>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <div className={cn('flex items-center justify-between rounded px-2 py-1 border', getScoreBg(score.action_match))}>
                    <span className="text-muted-foreground">Action</span>
                    <span className={cn('font-medium', getScoreColor(score.action_match))}>{score.action_match}</span>
                  </div>
                  <div className={cn('flex items-center justify-between rounded px-2 py-1 border', getScoreBg(score.appearance_match))}>
                    <span className="text-muted-foreground">Appear</span>
                    <span className={cn('font-medium', getScoreColor(score.appearance_match))}>{score.appearance_match}</span>
                  </div>
                  <div className={cn('flex items-center justify-between rounded px-2 py-1 border', getScoreBg(score.overall_quality))}>
                    <span className="text-muted-foreground">Quality</span>
                    <span className={cn('font-medium', getScoreColor(score.overall_quality))}>{score.overall_quality}</span>
                  </div>
                  <div className={cn('flex items-center justify-between rounded px-2 py-1 border', getScoreBg(score.composite_score))}>
                    <span className="text-muted-foreground">Overall</span>
                    <span className={cn('font-medium', getScoreColor(score.composite_score))}>{score.composite_score}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Vision Details */}
            {score?.vision_analysis?.description && (
              <div className="text-xs bg-muted/50 p-2 rounded border">
                <p className="break-words leading-relaxed">{score.vision_analysis.description}</p>
              </div>
            )}

            {/* Admin: Score/Re-score button */}
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleTriggerScoring}
                disabled={isScoring}
                className="w-full h-7 text-xs"
              >
                <RefreshCw className={cn('h-3 w-3 mr-1', isScoring && 'animate-spin')} />
                {score?.vision_analysis ? 'Re-score' : 'Score Image'}
              </Button>
            )}

            {/* Admin Controls Section */}
            {isAdmin && score && (
              <div className="space-y-3 border-t border-border pt-3">
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">Admin Scoring</span>
                </div>

                {/* Admin per-dimension ratings */}
                <div className="space-y-1.5">
                  <DimensionStars
                    label="Action Match"
                    value={adminActionRating}
                    hoverValue={null}
                    onRate={setAdminActionRating}
                    onHover={() => {}}
                  />
                  <DimensionStars
                    label="Appearance"
                    value={adminAppearanceRating}
                    hoverValue={null}
                    onRate={setAdminAppearanceRating}
                    onHover={() => {}}
                  />
                  <DimensionStars
                    label="Quality"
                    value={adminQualityRating}
                    hoverValue={null}
                    onRate={setAdminQualityRating}
                    onHover={() => {}}
                  />
                </div>

                {/* Feedback Tags */}
                <div className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">Feedback Tags</span>
                  <div className="flex flex-wrap gap-1">
                    {FEEDBACK_TAG_OPTIONS.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full border transition-colors',
                          feedbackTags.includes(tag)
                            ? 'bg-primary/20 border-primary/40 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/30'
                        )}
                      >
                        {tag.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Admin Comment */}
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Comment</span>
                  <Textarea
                    value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                    placeholder="Admin notes..."
                    className="min-h-[40px] text-xs resize-none"
                    rows={2}
                  />
                </div>

                {/* Preserve Toggle */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Preserve Image</span>
                    <Switch checked={preserveImage} onCheckedChange={setPreserveImage} />
                  </div>
                  {preserveImage && (
                    <Input
                      value={preserveReason}
                      onChange={(e) => setPreserveReason(e.target.value)}
                      placeholder="Reason for preserving..."
                      className="h-7 text-xs"
                    />
                  )}
                </div>

                {/* Save Button */}
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveAdmin}
                  disabled={isSavingAdmin}
                  className="w-full h-7 text-xs"
                >
                  <Save className="h-3 w-3 mr-1" />
                  {isSavingAdmin ? 'Saving...' : 'Save Admin Scoring'}
                </Button>
              </div>
            )}

            {/* No score yet message */}
            {!score && !isLoading && (
              <p className="text-xs text-muted-foreground text-center py-2">
                No score yet. Rate this image or{isAdmin ? ' click Score to analyze.' : ' check back later.'}
              </p>
            )}
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};