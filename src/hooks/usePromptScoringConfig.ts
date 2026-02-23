import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PromptScoringConfig {
  enabled: boolean;
  autoAnalysisEnabled: boolean;
  showQuickRating: boolean;
  visionModelId: string | null;
  scoringWeights: {
    actionMatch: number;
    appearanceMatch: number;
    overallQuality: number;
  };
}

const DEFAULT_CONFIG: PromptScoringConfig = {
  enabled: false,
  autoAnalysisEnabled: false,
  showQuickRating: false,
  visionModelId: null,
  scoringWeights: {
    actionMatch: 0.4,
    appearanceMatch: 0.35,
    overallQuality: 0.25,
  },
};

/**
 * Hook to fetch prompt scoring configuration from system_config
 * Used to check if quick rating should be shown on asset tiles
 */
export const usePromptScoringConfig = () => {
  const [config, setConfig] = useState<PromptScoringConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('system_config')
          .select('config')
          .eq('id', 1)
          .single();

        if (error || !data) {
          console.warn('⚠️ Could not fetch prompt scoring config:', error);
          return;
        }

        const sysConfig = data.config as any;
        const promptScoring = sysConfig?.promptScoring || {};

        if (mounted) {
          setConfig({
            enabled: promptScoring.enabled ?? false,
            autoAnalysisEnabled: promptScoring.autoAnalysisEnabled ?? false,
            showQuickRating: promptScoring.showQuickRating ?? false,
            visionModelId: promptScoring.visionModelId ?? null,
            scoringWeights: {
              actionMatch: promptScoring.scoringWeights?.actionMatch ?? 0.4,
              appearanceMatch: promptScoring.scoringWeights?.appearanceMatch ?? 0.35,
              overallQuality: promptScoring.scoringWeights?.overallQuality ?? 0.25,
            },
          });
        }
      } catch (err) {
        console.error('❌ Error fetching prompt scoring config:', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchConfig();

    // Listen for changes to system_config
    const channel = supabase
      .channel('prompt-scoring-config')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_config',
          filter: 'id=eq.1',
        },
        () => {
          if (mounted) {
            fetchConfig();
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const showQuickRating = config.enabled && config.showQuickRating;
  console.log('🔧 usePromptScoringConfig:', { config, showQuickRating });

  return {
    config,
    isLoading,
    showQuickRating,
  };
};
