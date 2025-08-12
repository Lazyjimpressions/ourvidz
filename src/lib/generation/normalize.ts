// Normalization helpers for media quality and model tags
// Keep logic simple: quality is always 'fast' or 'high'. Model is derived from metadata.

export type NormalizedQuality = 'fast' | 'high';
export type NormalizedModel = 'SDXL' | 'WAN' | 'Enhanced-7B' | 'Unknown';

interface WithOptionalFields {
  quality?: string | null;
  format?: string | null;
  metadata?: any;
  generation_mode?: string | null;
}

export function normalizeQuality(row: WithOptionalFields, fallback: NormalizedQuality = 'fast'): NormalizedQuality {
  const q = (row.quality || row?.metadata?.quality || '').toString().toLowerCase();
  if (q === 'high' || q === 'hq') return 'high';
  if (q === 'fast' || q === 'standard' || q === 'low') return 'fast';
  return fallback;
}

export function normalizeModel(row: WithOptionalFields): NormalizedModel {
  const m = row?.metadata || {};
  const mode = (row.generation_mode || '').toString().toLowerCase();
  const modelType = (m.model_type || m.job_model_type || '').toString().toLowerCase();
  const jobType = (m.job_type || '').toString().toLowerCase();

  if (m.is_sdxl || mode === 'sdxl' || modelType.includes('sdxl')) return 'SDXL';
  if (modelType.includes('7b') || jobType.includes('7b') || jobType.includes('enhanced')) return 'Enhanced-7B';
  if (modelType.includes('wan')) return 'WAN';
  return 'WAN';
}

export function preferThumbnail(url?: string | null, thumbnail?: string | null): string | undefined {
  return (thumbnail || url || undefined) as string | undefined;
}
