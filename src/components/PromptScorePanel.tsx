import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, ChevronUp, Star, Sparkles, Eye, Palette, Save, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePromptScores, PromptScore, FEEDBACK_TAGS } from '@/hooks/usePromptScores';
import { cn } from '@/lib/utils';

interface PromptScorePanelProps {
  jobId: string | null;
  className?: string;
}

export const PromptScorePanel = ({ jobId, className }: PromptScorePanelProps) => {
  const { isAdmin } = useAuth();
  const {
    score,
    isLoading,
    hasScore,
    submitAdminRating,
    togglePreservation,
    triggerScoring,
    refetch,
  } = usePromptScores(jobId);

  const [isExpanded, setIsExpanded] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Local state for editing
  const [actionRating, setActionRating] = useState<number | undefined>();
  const [appearanceRating, setAppearanceRating] = useState<number | undefined>();
  const [qualityRating, setQualityRating] = useState<number | undefined>();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');

  // Sync local state with score data
  useEffect(() => {
    if (score) {
      setActionRating(score.admin_action_rating ?? undefined);
      setAppearanceRating(score.admin_appearance_rating ?? undefined);
      setQualityRating(score.admin_quality_rating ?? undefined);
      setSelectedTags(score.feedback_tags || []);
      setComment(score.admin_comment || '');
      setHasChanges(false);
    }
  }, [score]);

  // Track changes
  useEffect(() => {
    if (!score) return;
    const changed =
      actionRating !== (score.admin_action_rating ?? undefined) ||
      appearanceRating !== (score.admin_appearance_rating ?? undefined) ||
      qualityRating !== (score.admin_quality_rating ?? undefined) ||
      JSON.stringify(selectedTags) !== JSON.stringify(score.feedback_tags || []) ||
      comment !== (score.admin_comment || '');
    setHasChanges(changed);
  }, [actionRating, appearanceRating, qualityRating, selectedTags, comment, score]);

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleSave = useCallback(async () => {
    await submitAdminRating({
      actionRating,
      appearanceRating,
      qualityRating,
      feedbackTags: selectedTags,
      comment: comment || undefined,
    });
  }, [actionRating, appearanceRating, qualityRating, selectedTags, comment, submitAdminRating]);

  // Hide panel for non-admins or if no job
  if (!isAdmin || !jobId) return null;

  const formatScore = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '-';
    return val.toFixed(1);
  };

  const getScoreColor = (val: number | null | undefined) => {
    if (val === null || val === undefined) return 'text-gray-400';
    if (val >= 4) return 'text-green-400';
    if (val >= 2.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className={cn('border border-gray-700 rounded-lg bg-gray-800/50', className)}>
      {/* Collapsed Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-medium text-gray-200">Prompt Scoring</span>

          {/* Vision scores preview */}
          {hasScore && score && (
            <div className="flex items-center gap-2 ml-2">
              <Badge variant="outline" className="text-xs bg-gray-900/50 border-gray-600">
                <Star className="h-3 w-3 mr-1" />
                <span className={getScoreColor(score.composite_score)}>
                  {formatScore(score.composite_score)}
                </span>
              </Badge>
            </div>
          )}

          {!hasScore && !isLoading && (
            <Badge variant="outline" className="text-xs bg-gray-900/50 border-gray-600 text-gray-400">
              No score
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              Unsaved
            </Badge>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-700">
          {/* Vision Analysis Section */}
          {hasScore && score?.vision_analysis && (
            <div className="pt-4">
              <div className="text-xs text-gray-400 mb-2">Vision Analysis</div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-gray-400 mb-1">
                    <Eye className="h-3 w-3" />
                    Action
                  </div>
                  <div className={cn('text-lg font-semibold', getScoreColor(score.action_match))}>
                    {formatScore(score.action_match)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-gray-400 mb-1">
                    <Palette className="h-3 w-3" />
                    Appearance
                  </div>
                  <div className={cn('text-lg font-semibold', getScoreColor(score.appearance_match))}>
                    {formatScore(score.appearance_match)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-gray-400 mb-1">
                    <Star className="h-3 w-3" />
                    Quality
                  </div>
                  <div className={cn('text-lg font-semibold', getScoreColor(score.overall_quality))}>
                    {formatScore(score.overall_quality)}
                  </div>
                </div>
              </div>

              {/* Vision details */}
              {score.vision_analysis.description && (
                <div className="mt-3 text-xs text-gray-400 bg-gray-900/50 p-2 rounded">
                  {score.vision_analysis.description}
                </div>
              )}
            </div>
          )}

          {/* No Score - Trigger Button */}
          {!hasScore && !isLoading && (
            <div className="pt-4 text-center">
              <p className="text-sm text-gray-400 mb-3">No vision analysis available</p>
              <Button
                variant="outline"
                size="sm"
                onClick={triggerScoring}
                className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Analyze Now
              </Button>
            </div>
          )}

          {/* Admin Rating Section */}
          {hasScore && (
            <>
              <div className="border-t border-gray-700 pt-4">
                <div className="text-xs text-gray-400 mb-2">Admin Rating</div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Action</label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={actionRating ?? ''}
                      onChange={(e) => setActionRating(e.target.value ? Number(e.target.value) : undefined)}
                      className="h-8 text-center bg-gray-900 border-gray-600"
                      placeholder="-"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Appearance</label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={appearanceRating ?? ''}
                      onChange={(e) => setAppearanceRating(e.target.value ? Number(e.target.value) : undefined)}
                      className="h-8 text-center bg-gray-900 border-gray-600"
                      placeholder="-"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Quality</label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={qualityRating ?? ''}
                      onChange={(e) => setQualityRating(e.target.value ? Number(e.target.value) : undefined)}
                      className="h-8 text-center bg-gray-900 border-gray-600"
                      placeholder="-"
                    />
                  </div>
                </div>
              </div>

              {/* Feedback Tags */}
              <div>
                <div className="text-xs text-gray-400 mb-2">Feedback Tags</div>
                <div className="flex flex-wrap gap-1.5">
                  {/* Positive tags */}
                  {FEEDBACK_TAGS.positive.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      className={cn(
                        'px-2 py-0.5 text-xs rounded-full border transition-colors',
                        selectedTags.includes(tag)
                          ? 'bg-green-500/20 border-green-500/50 text-green-400'
                          : 'border-gray-600 text-gray-400 hover:border-gray-500'
                      )}
                    >
                      {tag.replace(/_/g, ' ')}
                    </button>
                  ))}
                  {/* Negative tags */}
                  {FEEDBACK_TAGS.negative.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      className={cn(
                        'px-2 py-0.5 text-xs rounded-full border transition-colors',
                        selectedTags.includes(tag)
                          ? 'bg-red-500/20 border-red-500/50 text-red-400'
                          : 'border-gray-600 text-gray-400 hover:border-gray-500'
                      )}
                    >
                      {tag.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div>
                <div className="text-xs text-gray-400 mb-2">Comment</div>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Optional notes..."
                  className="min-h-[60px] bg-gray-900 border-gray-600 text-sm resize-none"
                />
              </div>

              {/* Save Button */}
              {hasChanges && (
                <div className="flex justify-end">
                  <Button
                    onClick={handleSave}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Rating
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Refresh */}
          <div className="flex justify-end pt-2 border-t border-gray-700">
            <Button
              variant="ghost"
              size="sm"
              onClick={refetch}
              disabled={isLoading}
              className="text-gray-400 hover:text-white"
            >
              <RefreshCw className={cn('h-3 w-3 mr-1', isLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
