/**
 * Builds MultiCondition keyframe slot list matching `useLibraryFirstWorkspace` fal video
 * multi branch (`filledEntries` ~1490–1500). Keep in sync when that logic changes.
 *
 * URLs are treated as already stripped/normalized for comparison; slot indices are 0–4.
 */
export interface MultiConditionKeyframeEntry {
  /** Signed or public URL passed to fal */
  url: string;
  /** UI / temporal slot: Start=0, Key2–4=1–3, End=4 */
  slotIndex: number;
}

/**
 * @param params - Start URL, additional row (from `referenceImage2Url` + `additionalRefUrls`), and end URL
 * @returns Ordered keyframe entries before `stripToStoragePath` (caller applies strip)
 */
export function buildMultiConditionFilledEntries(params: {
  /** Start frame (slot 0); maps from `startRefUrl` / `refImageUrl` in the hook */
  refImageUrl: string | null | undefined;
  /** From `handleGenerate`: `[...(referenceImage2Url ? [referenceImage2Url] : []), ...additionalRefUrls]` */
  additionalImageUrls: (string | null | undefined)[] | undefined;
  /** End frame (slot 4); maps from `endRefUrl` / `endingRefImageUrl` */
  endRefUrl: string | null | undefined;
}): MultiConditionKeyframeEntry[] {
  const filled: MultiConditionKeyframeEntry[] = [];
  const start = params.refImageUrl?.trim();
  if (start) filled.push({ url: start, slotIndex: 0 });

  const extras = params.additionalImageUrls ?? [];
  extras.forEach((url, i) => {
    if (url && typeof url === 'string' && url.trim() !== '') {
      filled.push({ url: url.trim(), slotIndex: i + 1 });
    }
  });

  const end = params.endRefUrl?.trim();
  if (end) filled.push({ url: end, slotIndex: 4 });

  return filled;
}
