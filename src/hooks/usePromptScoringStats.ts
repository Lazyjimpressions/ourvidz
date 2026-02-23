import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ModelPerformance {
  model_id: string;
  model_name: string;
  model_key: string;
  avg_action: number;
  avg_appearance: number;
  avg_quality: number;
  avg_composite: number;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

export interface TagFrequency {
  tag: string;
  count: number;
  percentage: number;
}

export interface OverallStats {
  totalScored: number;
  avgComposite: number;
  modelsAnalyzed: number;
  unratedCount: number;
  adminRatedCount: number;
  userRatedCount: number;
}

export interface DailyTrend {
  date: string;
  avg_score: number;
  count: number;
}

type TimeRange = '7d' | '30d' | '90d' | 'all';

const getDateFilter = (range: TimeRange): Date | null => {
  if (range === 'all') return null;
  const now = new Date();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  now.setDate(now.getDate() - days);
  return now;
};

export const usePromptScoringStats = (initialRange: TimeRange = '30d') => {
  const [timeRange, setTimeRange] = useState<TimeRange>(initialRange);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [overallStats, setOverallStats] = useState<OverallStats>({
    totalScored: 0,
    avgComposite: 0,
    modelsAnalyzed: 0,
    unratedCount: 0,
    adminRatedCount: 0,
    userRatedCount: 0,
  });

  const [modelPerformance, setModelPerformance] = useState<ModelPerformance[]>([]);
  const [tagFrequencies, setTagFrequencies] = useState<TagFrequency[]>([]);
  const [dailyTrends, setDailyTrends] = useState<DailyTrend[]>([]);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const dateFilter = getDateFilter(timeRange);

    try {
      // Build base query
      let baseQuery = (supabase as any).from('prompt_scores').select('*');
      if (dateFilter) {
        baseQuery = baseQuery.gte('created_at', dateFilter.toISOString());
      }

      // 1. Fetch all scores in range
      const { data: scores, error: scoresError } = await baseQuery;

      if (scoresError) throw scoresError;

      const allScores = scores || [];

      // 2. Calculate overall stats
      const totalScored = allScores.length;
      const avgComposite = totalScored > 0
        ? allScores.reduce((sum: number, s: any) => sum + (s.composite_score || 0), 0) / totalScored
        : 0;

      const modelIds = new Set(allScores.map((s: any) => s.api_model_id).filter(Boolean));
      const modelsAnalyzed = modelIds.size;

      const unratedCount = allScores.filter((s: any) =>
        !s.admin_action_rating && !s.admin_appearance_rating && !s.admin_quality_rating
      ).length;

      const adminRatedCount = allScores.filter((s: any) =>
        s.admin_action_rating || s.admin_appearance_rating || s.admin_quality_rating
      ).length;

      const userRatedCount = allScores.filter((s: any) =>
        s.user_action_rating || s.user_appearance_rating || s.user_quality_rating
      ).length;

      setOverallStats({
        totalScored,
        avgComposite: Math.round(avgComposite * 10) / 10,
        modelsAnalyzed,
        unratedCount,
        adminRatedCount,
        userRatedCount,
      });

      // 3. Fetch model names
      const { data: models } = await supabase
        .from('api_models')
        .select('id, display_name, model_key');

      const modelMap = new Map<string, { name: string; key: string }>();
      (models || []).forEach((m: any) => {
        modelMap.set(m.id, { name: m.display_name, key: m.model_key });
      });

      // 4. Aggregate per-model performance
      const modelStats = new Map<string, {
        action: number[];
        appearance: number[];
        quality: number[];
        composite: number[];
        recentScores: number[];
        olderScores: number[];
      }>();

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      allScores.forEach((s: any) => {
        if (!s.api_model_id) return;

        if (!modelStats.has(s.api_model_id)) {
          modelStats.set(s.api_model_id, {
            action: [],
            appearance: [],
            quality: [],
            composite: [],
            recentScores: [],
            olderScores: [],
          });
        }

        const stats = modelStats.get(s.api_model_id)!;
        if (s.action_match != null) stats.action.push(s.action_match);
        if (s.appearance_match != null) stats.appearance.push(s.appearance_match);
        if (s.overall_quality != null) stats.quality.push(s.overall_quality);
        if (s.composite_score != null) stats.composite.push(s.composite_score);

        // Track for trend calculation
        const createdAt = new Date(s.created_at);
        if (s.composite_score != null) {
          if (createdAt >= sevenDaysAgo) {
            stats.recentScores.push(s.composite_score);
          } else if (createdAt >= fourteenDaysAgo) {
            stats.olderScores.push(s.composite_score);
          }
        }
      });

      const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

      const performanceData: ModelPerformance[] = [];
      modelStats.forEach((stats, modelId) => {
        const modelInfo = modelMap.get(modelId);
        const recentAvg = avg(stats.recentScores);
        const olderAvg = avg(stats.olderScores);

        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (stats.recentScores.length >= 3 && stats.olderScores.length >= 3) {
          const diff = recentAvg - olderAvg;
          if (diff > 0.2) trend = 'up';
          else if (diff < -0.2) trend = 'down';
        }

        performanceData.push({
          model_id: modelId,
          model_name: modelInfo?.name || 'Unknown Model',
          model_key: modelInfo?.key || modelId,
          avg_action: Math.round(avg(stats.action) * 10) / 10,
          avg_appearance: Math.round(avg(stats.appearance) * 10) / 10,
          avg_quality: Math.round(avg(stats.quality) * 10) / 10,
          avg_composite: Math.round(avg(stats.composite) * 10) / 10,
          count: stats.composite.length,
          trend,
        });
      });

      // Sort by count descending
      performanceData.sort((a, b) => b.count - a.count);
      setModelPerformance(performanceData);

      // 5. Calculate tag frequencies
      const tagCounts = new Map<string, number>();
      let totalTags = 0;

      allScores.forEach((s: any) => {
        const tags = s.feedback_tags || [];
        tags.forEach((tag: string) => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          totalTags++;
        });
      });

      const frequencies: TagFrequency[] = [];
      tagCounts.forEach((count, tag) => {
        frequencies.push({
          tag,
          count,
          percentage: totalTags > 0 ? Math.round((count / totalTags) * 100) : 0,
        });
      });

      frequencies.sort((a, b) => b.count - a.count);
      setTagFrequencies(frequencies);

      // 6. Calculate daily trends (last 30 days max)
      const dailyMap = new Map<string, { total: number; count: number }>();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      allScores.forEach((s: any) => {
        if (!s.composite_score) return;
        const createdAt = new Date(s.created_at);
        if (createdAt < thirtyDaysAgo) return;

        const dateKey = createdAt.toISOString().split('T')[0];
        if (!dailyMap.has(dateKey)) {
          dailyMap.set(dateKey, { total: 0, count: 0 });
        }
        const day = dailyMap.get(dateKey)!;
        day.total += s.composite_score;
        day.count++;
      });

      const trends: DailyTrend[] = [];
      dailyMap.forEach((data, date) => {
        trends.push({
          date,
          avg_score: Math.round((data.total / data.count) * 10) / 10,
          count: data.count,
        });
      });

      trends.sort((a, b) => a.date.localeCompare(b.date));
      setDailyTrends(trends);

    } catch (err) {
      console.error('Error fetching prompt scoring stats:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch stats'));
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  // Fetch on mount and when timeRange changes
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    timeRange,
    setTimeRange,
    isLoading,
    error,
    overallStats,
    modelPerformance,
    tagFrequencies,
    dailyTrends,
    refetch: fetchStats,
  };
};
