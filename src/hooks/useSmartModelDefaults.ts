import { useCallback } from 'react';
import { useAllVisualModels } from './useApiModels';

type VisualTask = 't2i' | 'i2i' | 't2v' | 'i2v' | 'extend' | 'multi';

/**
 * Smart model defaults hook.
 * Queries all active visual models once and provides a `getDefault(task)` helper
 * that returns the best model for a given task.
 *
 * Resolution order:
 *   1. Model with `default_for_tasks` containing the requested task
 *   2. Highest-priority model with matching `task` column
 */
export const useSmartModelDefaults = () => {
  const { data, isLoading } = useAllVisualModels();

  const getDefault = useCallback(
    (task: VisualTask) => {
      if (!data?.all) return null;

      // 1. Explicit default
      const explicit = data.all.find(
        (m) => Array.isArray((m as any).default_for_tasks) && (m as any).default_for_tasks?.includes(task)
      );
      if (explicit) return explicit;

      // 2. Fallback: highest priority with matching task (already sorted desc)
      return data.all.find((m) => m.tasks?.includes(task)) ?? null;
    },
    [data],
  );

  return { getDefault, isLoading, models: data };
};
